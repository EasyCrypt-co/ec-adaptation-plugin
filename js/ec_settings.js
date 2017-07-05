/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

var ECSettingsCFG = {
		
};

rcmail.addEventListener('init', function (evt) {
	if (ECClientCFG.debugExt)log('eventInit',evt);
	
	if (evt.task == 'settings'){
		initGlobalSettings();
		switch (evt.action) {
			case "identities":
				initIdentities();
				break;
			case "edit-identity":
				initEditIdentity();
				break;
			case "folders":
				initFolders();
				break;
		}
	}
	switch(evt.task){
		case 'mail':
			initTopMenu(); break;
		case 'settings':
			initTopMenuSettings(); break;
		case 'addressbook':
			initTopMenuAddrBook();
		break;
	}
});

function initGlobalSettings(){
	rcmail._section_select=rcmail.section_select;
	rcmail.section_select = function (list) {
        var res=rcmail._section_select(list);
        $('#settings-right').attr('class','').addClass($('#sectionslist .selected').attr('id')+'-'+$('#settings-tabs .selected').attr('id'));
        return res;
    };
	
	if (rcmail.gui_objects.sectionslist && (rcmail.env.action=="preferences" || !rcmail.env.action)){
		$($('.section',rcmail.gui_objects.sectionslist).get(0)).mousedown();
		$('#taskbar .button-addressbook').remove();
		$('#taskbar .button-mail span').html(rcmail.get_label('ec_plugin.close'));
	}
	$('#taskbar').addClass('global-taskbar-'+rcmail.env.task);
	$('#taskbar .button-addressbook').remove();
	$('#taskbar .button-mail').click(function(){
		if (getECSessions('mail','').length>0 || getECSessions('mail','list').length>0 || getECSessions('mail','show').length>0
				 || getECSessions('mail','preview').length>0 || getECSessions('mail','compose').length>0){
			window.close();
			return false;
		}
	});
	
	if (rcmail.env.action=='edit-prefs'){
		$('.boxcontent').addClass('visible');
		$('body').addClass(window.parent.$('#settings-right').attr('class'));
		
		if (!ECClientCFG.enableLanguageSelect){
			$('#rcmfd_lang').parent().parent().hide();
		}
	} else {
		$('.boxcontent').addClass('visible');
	}
}

function initIdentities(){
	$('.boxfooter').hide();
	setInterval(function(){
		rcmail.stop_previewAnime();
	},1000);
}

function initFolders(){
	$('#subscription-table li').each(function(){
		var t=$(this);
		if (!t.hasClass('root') && t.attr('aria-level')!='1'){
			$('input',t).click(function(){
				var tinp=$(this);
				var thisli=t;
				while(true){
					var parentli=thisli.parent().parent();
					if (!parentli.hasClass('root')){
						var inp=parentli.children().filter('input');
						if (tinp.get(0).checked && !inp.get(0).checked)inp.click();
						thisli=parentli;
					}
					if (thisli.parent().attr('id')=='subscription-table')break;
				}
				
			});
		}
	});
	setInterval(function(){
		rcmail.stop_previewAnime();
	},1000);
}

function initEditIdentity(){
	$('#rcmfd_email').attr('readonly','1');
}



function initTopMenuSettings() {
	initTopMenu();
	$('#taskbar .button-addressbook').remove();
	$('#taskbar .button-settings-options').remove();
}

function initTopMenuAddrBook() {
	initTopMenu();
	$('#taskbar .button-addressbook').remove();
	$('#taskbar .button-settings-options').remove();
	$('#taskbar .button-mail span').html(rcmail.get_label('ec_plugin.close'));
	$('#taskbar .button-mail').click(function(){
		window.close();
		return false;
	});
}

function initTopMenu(){
	if (ECClientCFG.enableTaskbarEmail){
		var emailtag='<a class="button-email" id="rcmbtn1100" role="button" href="./?_task=mail" onclick="return rcmail.command(\'switch-task\',\'mail\',this,event)" tabindex="-1" aria-disabled="true">'+
		'<span class="button-inner">'+rcmail.env.ec_identities[0].email+'</span><span class="tooltip">'+rcmail.env.ec_identities[0].email+'</span></a>';
		$('#taskbar').prepend(emailtag);
	}
	
	if (ECClientCFG.enableHelpDropdown || ECClientCFG.enableTaskbarHelp){
		var setbtn2='<a target="_blank" class="button-help-options" href="javascript:void(0)" id="help-optionslink" onclick="ec_help_showOptions(this)" aria-expanded="true">'+
		'<span class="button-inner"><span>'+rcmail.get_label('ec_plugin.setm_help')+'</span>'+
		'</span>'+
		'</a>';
		var setbtnj2=$(setbtn2);
		if (!ECClientCFG.enableHelpDropdown){
			setbtnj2.attr('onclick','').attr('href','https://easycrypt.co/help');
		}
		$('#taskbar').prepend(setbtnj2);
		if (ECClientCFG.enableHelpDropdown){
			var setopt2=$('<div id="help-options" class="popupmenu"></div>');
			setopt2.append('<a href="https://easycrypt.co/help" target="_blank">'+rcmail.get_label('ec_plugin.setm_help')+'</a>');
			if (ECClientCFG.enableHelpFAQ)setopt2.append('<a href="https://easycrypt.co/faq/" target="_blank">'+rcmail.get_label('ec_plugin.helpm_faq')+'</a>');
			if (ECClientCFG.enableHelpFAQ2)setopt2.append('<a href="https://easycrypt.co/beta-v02-release-notes-and-faq/" target="_blank">'+rcmail.get_label('ec_plugin.helpm_faq2')+'</a>');
			$('.set-opt-dis', setopt2).click(function(){
				return false;
			});
			$('body').append(setopt2);
		}
	}
	if (ECClientCFG.enableTaskbarSettings){
		var setbtn='<a class="button-settings-options" href="javascript:void(0)" id="settings-optionslink" onclick="ec_settings_showOptions(this)" aria-expanded="true">'+
		'<span class="button-inner"><span>'+rcmail.get_label('ec_plugin.setm_settings')+'</span>'+
		'</span>'+
		'</a>';
		var setbtnj=$(setbtn);
		$('#taskbar').prepend(setbtnj);
		var setopt=$('<div id="settings-options" class="popupmenu"></div>');
		if (ECClientCFG.enableSettingsSettings)setopt.append('<a href="./?_task=settings" target="_blank" _onclick="return rcmail.command(\'switch-task\',\'settings\',this,event)">'+rcmail.get_label('ec_plugin.setm_settings')+'</a>');
		if (ECClientCFG.enableSettingsAccount)setopt.append('<a href='+ECClientCFG.ecAccountService+' target="_blank">'+rcmail.get_label('ec_plugin.setm_account')+'</a>');
		if (ECClientCFG.enableSettingsHelp)setopt.append('<a href="https://easycrypt.co/help" target="_blank">'+rcmail.get_label('ec_plugin.setm_help')+'</a>');
		if (ECClientCFG.enableSettingsFeedback)setopt.append('<a target="_blank" href="javascript:void(0)" onclick="return new FeedbackPopup({},true)">'+rcmail.get_label('ec_plugin.feedback_btn')+'</a>');
		if (ECClientCFG.enableSettingsLogout)setopt.append('<a href="javascript:void(0)" onclick="return ec_topmenu_logout()">'+rcmail.get_label('ec_plugin.setm_logout')+'</a>');
		$('.set-opt-dis', setopt).click(function(){
			return false;
		});
		$('body').append(setopt);
	}
	if (ECClientCFG.enableFeedback){
		var feedtag='<a class="button-feed" id="rcmbtn90" role="button" target="_blank" href="javascript:void(0)" onclick="return new FeedbackPopup({},true)" tabindex="-1" aria-disabled="true">'+
		'<span class="button-inner">'+rcmail.get_label("ec_plugin.feedback_btn")+'</span><span class="tooltip">'+rcmail.get_label("ec_plugin.feedback_btn")+'</span></a>';
		$('#taskbar').append(feedtag);
	}
	if (ECClientCFG.enableTaskbarInvite){
		var invitetag='<a class="button-invite" id="rcmbtn99" role="button" href="javascript:openInvitePopup()" onclick="return openInvitePopup();" tabindex="-1" aria-disabled="true">'+
		'<span class="button-inner">'+rcmail.get_label("ec_plugin.invite")+'</span><span class="tooltip">'+rcmail.get_label("ec_plugin.invite")+'</span></a>';
		$('#taskbar').append(invitetag);
		new FloatingTooltip('#taskbar .button-invite',rcmail.get_label('ec_plugin.tooltip_invitebtn'),true);
	}
	
	setTimeout(function(){
		if (rcmail.env.task=='mail' && (rcmail.env.action=='list' || !rcmail.env.action)){
			$('#s_mod_text').get(0).checked=true;
			UI.set_searchmod($('#s_mod_text').get(0));
			$('#searchmenu-menu li').addClass('noli');
			$('#s_scope_base').parent().parent().removeClass('noli');
			$('#s_scope_sub').parent().parent().removeClass('noli');
			$('#s_scope_all').parent().parent().removeClass('noli');
			$('span', $('#s_scope_sub').parent()).html(rcmail.get_label("ec_plugin.searchradio2"));
		}
		if ((rcmail.env.task=='mail' && (rcmail.env.action=='list' || !rcmail.env.action)) || rcmail.env.task=='addressbook'){
			$('#quicksearchbar').append('<a class="searchbtnnew" onclick="return rcmail.command(\'search\');"></a>');
		}
	},0);
	
	if (rcmail.env.task=='addressbook'){
		setInterval(function(){
			rcmail.stop_previewAnime();
		},1000);
	}
	
}
function ec_topmenu_logout(){
	ecc.onLogout(function(){
		rcmail.command('switch-task','logout');
	});
	return false;
}
function ec_help_showOptions(){
	UI.show_popup('help-options');
}
function ec_settings_showOptions(){
	UI.show_popup('settings-options');
}

//sendInvites(Array emails, Function handler):jQuery ajax object
function sendInvites(emails, handler){
	var d={emails:emails};
	if (ECClientCFG.debugExt)log('send invites',d);
	var x=$.ajax({
		type: "POST",	url: pkdConf.authURL+'/user/invite',    xhrFields: {
        withCredentials: true
    },
    data:JSON.stringify(d),dataType:'json',contentType: 'application/json',
    crossDomain:true,
		success: function(data){
			handler(data);
		},
		error: function(){
			if (ECClientCFG.debugExt)log('error invite');
			handler(false);
		}
	});
	return x;
}
//getInvites(Function handler):jQuery ajax object
function getInvites(handler){
	var d={};
	var x=$.ajax({
		type: "GET",	url: pkdConf.authURL+'/user/invite',    xhrFields: {
        withCredentials: true
    },
    data:JSON.stringify(d),dataType:'json',contentType: 'application/json',crossDomain:true,
		success: function(data){
			handler(data);
		},
		error: function(){
			if (ECClientCFG.debugExt)log('error invite');
			handler(false);
		}
	});
	return x;
}
//openInvitePopup(Array inputemails, Bool directsend):Boolean
function openInvitePopup(inputemails, directsend, directhandler){
	if (rcmail.inviteOpen)return false;
	rcmail.inviteOpen=true;
	if (ECClientCFG.debugExt)log('open invite');
	var phtml='<div class="invite-title">'+ecobj.get_label('ec_plugin.invite_title')+
	'</div>'+
	'<div class="invite-dialog-title"><span>'+ecobj.get_label('ec_plugin.invite_popup_title')+
	'</span></div>'+
	'<div class="invite-dialog-list">'+
	'<textarea class="invite-textarea"></textarea>'+
	'<span class="invite-info"></span>'+
	'<span class="invite-notify"></span>'+
	'<span class="invite-subnotify"></span>'+
	'</div>';
	var msgid;
	var sendingInvites=false;
	var popup=rcmail.show_popup_dialog(
		phtml,
		ecobj.get_label('ec_plugin.invite'),
		[
			{
				text: ecobj.get_label('ec_plugin.invite_send'),
				'class': 'mainaction',
				click: function () {
					if (sendingInvites)return;
					var ed=ta.val().split(regNL).join(',').split(regWS).join('');
					var emails=extractEmails(ed,false);
					if (!directsend){
						if (emails.length==0 || emails.length!=emails.initCount){
							$('.invite-notify',popup).addClass('invite-warning displayblock').html(ecobj.get_label('ec_plugin.invite_invalidemails'));
							sb.removeClass('mainaction-lock');
							return;
						}
						else if (emails.length<=invites){
							
						} else if (emails.length>invites){
							$('.invite-notify',popup).addClass('invite-warning displayblock').html(ecobj.get_label('ec_plugin.invite_warning').replace('<number>',invites));
							sb.removeClass('mainaction-lock');
							return;
						}
					}
					var $dialog = $(this);
					sb.addClass('mainaction-lock');
					sendingInvites=true;
					sendInvites(emails, function(d){
						if (ECClientCFG.debugExt)log(d);
						sendingInvites=false;
						if (!d || d.status!='success'){
							$('.invite-notify',popup).addClass('invite-warning displayblock').html(ecobj.get_label('ec_plugin.invite_warning').replace('<number>',d && d.data ? d.data.invites : invites));
							sb.removeClass('mainaction-lock');
							return;
						}
						
						$('.invite-notify',popup).removeClass('invite-warning').addClass('displayblock').html(d.data.sent!=1 ? ecobj.get_label('ec_plugin.invite_sent_notify').replace('<Number>',d.data.sent) : ecobj.get_label('ec_plugin.invite_esent').replace('<emailadr>',d.data.sent_to[0]));
						var i=0;
						$('.invite-subnotify',popup).addClass('displayblock');
						if (d.data.exists && d.data.exists.length>0){
							for(i=0;i<d.data.exists.length;i++)$('.invite-subnotify',popup).append('<span>'+d.data.exists[i]+': '+ecobj.get_label('ec_plugin.invite_restype1')+'</span>');
						}
						if (d.data.failed && d.data.failed.length>0){
							for(i=0;i<d.data.failed.length;i++)$('.invite-subnotify',popup).append('<span>'+d.data.failed[i]+': '+ecobj.get_label('ec_plugin.invite_restype2')+'</span>');
						}
						if (d.data.not_supported && d.data.not_supported.length>0){
							for(i=0;i<d.data.not_supported.length;i++)$('.invite-subnotify',popup).append('<span>'+d.data.not_supported[i]+': '+d.data.not_supported[i].split('@')[1]+' '+ecobj.get_label('ec_plugin.invite_restype3')+'</span>');
						}
						if (d.data.exists.length>0 || d.data.failed.length>0){
							
						}
						cb.show();
						sb.hide();
						ta.addClass('hidden');
						cb.html(ecobj.get_label('ec_plugin.invite_ok'));
						$('.invite-dialog .invite-title').css('visibility','hidden');
						$('.invite-dialog .invite-dialog-title').hide();
						$('.invite-dialog .invite-info').hide();
						$('.invite-dialog').addClass('invite-dialog-result');
						onresize();
					});
				}
			},
			{
				text: ecobj.get_label('ec_plugin.invite_cancel'),
				click: function () {
					var $dialog = $(this);
					rcmail.inviteOpen=false;
					$(window).unbind('resize',onresize);
					$dialog.dialog('close');
					if (directhandler)directhandler();
				}
			}
		],{
			resizable:false,
			closeOnEscape:false,
			dialogClass:'invite-dialog'
		}
	);
	var sb=$($('.invite-dialog .ui-dialog-buttonset button').get(0));
	var cb=$($('.invite-dialog .ui-dialog-buttonset button').get(1));
	var ta=$('.invite-textarea',popup);
	var invites=0;
	getInvites(function(d){
		if (!d)d=0;
		else d=d.data.invites;
		invites=d;
		setInvitesTxt();
	});
	function setInvitesTxt(){
		$('.invite-info',popup).text(ecobj.get_label('ec_plugin.invite_count_notify').replace('<number>',invites));
	}
	function onresize(){
		var d=$('.invite-dialog');
		var ww=$(window).width(); var hh=$(window).height();
		var dw=d.width(); var dh=d.height();
		d.css({left:(ww-dw)*0.5+'px', top:(hh-dh)*0.5+'px'});
		
	};
	$(window).bind('resize',onresize);
	setInvitesTxt();
	$('.ui-widget-overlay').addClass('invite-overlay');
	if (inputemails && inputemails.length){
		ta.val(inputemails.join(','))
	}
	if (directsend){
		sb.click();
		sb.hide();
		ta.addClass('hidden');
		cb.html(ecobj.get_label('ec_plugin.invite_ok'));
		$('.invite-dialog .invite-dialog-title').hide();
		$('.invite-dialog .invite-info').hide();
		$('.invite-dialog .invite-title').html(ecobj.get_label(inputemails.length>1 ? 'ec_plugin.invite_directsend' : 'ec_plugin.invite_directsend2'));
		cb.hide();
		$('.invite-dialog').addClass("invite-dialog-direct");
		onresize();
	}
	
	return false;
}
