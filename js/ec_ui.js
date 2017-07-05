/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

var ECUICFG = {
		
};

/*
 * UTILS
 */

//FloatingTooltip(jQuery|String target, String msg, autoinit) : Object
//main functions - open, close, setText
function FloatingTooltip(target, msg, autoinit, custom, cls, snap){
	var ft=this;
	var obj=null;
	var moffsetx=10;
	var moffsety=10;
	$(target).trigger('FloatingTooltip_destroy');
	ft.uid=randomStr(8);
	$(target).attr('fltooltip',ft.uid);
	ft.open=function(){
		var obj=ft.getObject();
		ft.setText(msg);
		$('body').append(obj);
	};
	ft.close=function(){
		if (custom)ft.swapTitleOut();
		if (obj)obj.remove();
	};
	ft.move=function(x,y){
		if (obj){
			x+=moffsetx;
			y+=moffsety;
			if (snap){
				var off=$(target).offset();
				switch(snap){
				case 'top':
					y=off.top-obj.height()-moffsety;
					break;
				}
			}
			x=Math.min($(window).width()-obj.width()-moffsetx,x);
			y=Math.min($(window).height()-obj.height()-moffsety,y);
			obj.css({top:y+'px',left:x+'px'});
		}
	};
	ft.setText=function(txt){
		if (obj)obj.html(txt);
	};
	ft.getObject=function(){
		if (obj)return obj;
		var j=$('<div class="floating-tooltip"></div>');
		if (cls)j.addClass(cls);
		j.html(msg);
		obj=j;
		return j;
	};
	ft.mousemove=function(e){
		ft.move(e.clientX,e.clientY);
	};
	ft.mouseover=function(e){
		ft.open();
		if (custom)ft.swapTitleIn();
		ft.move(e.clientX,e.clientY);
	};
	ft.mouseout=function(e){
		ft.close();
	};
	ft.mousedown=function(e){
		ft.close();
	};
	ft.swapTitleIn=function(){
		$(target).attr('data-title',$(target).attr('title'));
		$(target).attr('title','');
	};
	ft.swapTitleOut=function(){
		$(target).attr('title',$(target).attr('data-title'));
	};
	ft.destroy=function(e){
		window.clearInterval(intid);
		ft.close();
		$(target).unbind('mousedown',ft.mousedown).unbind('mousemove',ft.mousemove).unbind('mouseover',ft.mouseover).unbind('mouseout',ft.mouseout).unbind('FloatingTooltip_destroy',ft.destroy);
	};
	ft.init=function(){
		if (!custom && ECClientCFG.defaultTooltips){
			$(target).attr('title',msg);
		} else {
			$(target).bind('mousedown',ft.mousedown).bind('mousemove',ft.mousemove).bind('mouseover',ft.mouseover).bind('mouseout',ft.mouseout)
			.bind('FloatingTooltip_destroy',ft.destroy).bind('FloatingTooltip_close',ft.close);
			intid=setInterval(function(){
				if($(target).parent().length==0){
					ft.destroy();
				}
			},100);
		}
	};
	var intid=null;
	if (autoinit)ft.init();
	
	return ft;
}

//FeedbackPopup(Object cfg, Bool autoopen) : Object
//main functions - open, close, submit
function FeedbackPopup(cfg, autoopen){
	var fpo=this;
	this.cfg=cfg;
	var formaction='./?_task=mail';
	var formdata="";
	var popup=null;
	var sb=null;
	var cb=null;
	
	this.open=function(){
		if (popup)return false;
		popup=rcmail.show_popup_dialog(
			fpo.getContent(),
			fpo.getTitle(),
			[
				{
					text: ecobj.get_label('ec_plugin.feedback_submit'),
					'class': 'mainaction',
					click: function () {
						fpo.submit();
					}
				},
				{
					text: ecobj.get_label('ec_plugin.feedback_close'),
					click: function () {
						fpo.close();
					}
				}
			],{
				resizable:false,
				closeOnEscape:false,
				dialogClass:'feedback-dialog'
			}
		);
		sb=$($('.feedback-dialog .ui-dialog-buttonset button').get(0));
		cb=$($('.feedback-dialog .ui-dialog-buttonset button').get(1));
		$('.ui-widget-overlay').addClass('feedback-overlay');
		return true;
	};
	this.close=function(){
		if (!popup)return false;
		
		popup.dialog('close');
		popup=null;
		sb=null;
		cb=null;
		
		return true;
	};
	this.getPopup=function(){
		return popup;
	};
	this.onsubmit=function(cid, data){
		fpo.close();
	};
	this.submit=function(){
		var inp=fpo.verifyInput();
		if (inp){
			sb.addClass('mainaction-lock');
			fpo.sendEmail(inp, fpo.onsubmit);
			return true;
		}
		
		return false;
	};
	this.getFormData=function(){
		var d={};
		d.summary="";
		d.desc=$('.feedback-desc',popup).val();
		d.about=$('.feedback-about',popup).val();
		return d;
	};
	this.verifyInput=function(){
		var inp=fpo.getFormData();
		if (!inp.desc){
			fpo.showError('.feedback-desc',ecobj.get_label('ec_plugin.feedback_input_description'));
			return false;
		}
		return inp;
	};
	this.getContent=function(){
		var phtml='<div class="feedback-title">'+fpo.getTitle()+
		'</div>'+
		'<div class="feedback-dialog-title"><span>'+
		'</span></div>'+
		'<div class="feedback-dialog-list">'+
		'<div>'+'<label>'+ecobj.get_label('ec_plugin.feedback_about')+'</label>'+'<select class="feedback-about">'+
		'<option >'+ecobj.get_label('ec_plugin.feedback_option1')+'</option>'+
		'<option >'+ecobj.get_label('ec_plugin.feedback_option2')+'</option>'+
		'<option >'+ecobj.get_label('ec_plugin.feedback_option3')+'</option>'+
		'<option >'+ecobj.get_label('ec_plugin.feedback_option4')+'</option>'+
		'</select></div>'+
		'<div>'+'<label>'+ecobj.get_label('ec_plugin.feedback_desc')+'</label>'+'<textarea class="feedback-desc"></textarea></div>'+
		'<span class="feedback-notify"></span>'+
		'</div>';
		return phtml;
	};
	this.getTitle=function(){
		var t=ecobj.get_label('ec_plugin.feedback_title');
		return t;
	};
	this.showError=function(target,txt,type){
		if (target){
			$(target,popup).focus();
		}
		$('.feedback-notify',popup).addClass('displayblock').text(txt);
	};
	this.getRec=function(){
		return ECClientCFG.feedbackSupport;
	};
	this.sendEmail=function(data, handler){
		fpo.showError(null,ecobj.get_label('ec_plugin.feedback_isending'));
		
		encryptContent(wrapMimeBody(data.desc, data.desc, null, null).body,function(result){
			data.desc=result;
			onencrypted();
		},false,[fpo.getRec(),rcmail.env.ec_identities[0].email],null,true);
		
		function onencrypted(){
			getComposeId(function(composeid){
				var title=data.summary || (ecobj.get_label('ec_plugin.feedback_emailtitle')+': '+data.about+' [@EMAIL]');
				title=title.replace('[@EMAIL]',rcmail.env.ec_identities[0].ident);
				var ed=new ECEmailFormData(composeid, title, fpo.getRec(), data.desc,true);
				formdata=ed.serialize();
				var x=$.ajax({
					type: "POST",	url: formaction,	data:formdata,
					success: function(data){
						
						if (handler)handler(composeid,data);
					}
				});
			}, formaction);
		}
	};
	
	if (autoopen)this.open();
	
	return this;
}

/*
 * VIEW
 */


