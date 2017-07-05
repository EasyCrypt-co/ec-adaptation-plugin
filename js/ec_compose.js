/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

/*
 * UTILS
 */

//generateEncryptUsers(Boolean valid==undefined) : Array
//exports users for encryption (not)including valid ones from all inputs
function generateEncryptUsers(valid, from, toSel, ccSel, bccSel) {
	if (valid===undefined)valid=null;
	var recipients = [];
    if (ECClientCFG.encryptFrom && valid!==false){
    	recipients.push(from || (rcmail.env.identities[$('#_from').val()].email));
    }
    if (!toSel)toSel='.toSelector';
    if (!ccSel)ccSel='.ccSelector';
    if (!bccSel)bccSel='.bccSelector';
    
    $(toSel+' .select2-selection__choice').each(function(){
    	if (valid===null || (valid && $(this).hasClass(ECClientCFG.validEmailCLS)) || (!valid && !$(this).hasClass(ECClientCFG.validEmailCLS)))
    		recipients.push( $(this).attr('title') );
	});
    if (ECClientCFG.encryptCC){
    	$(ccSel+' .select2-selection__choice').each(function(){
    		if (valid===null || (valid && $(this).hasClass(ECClientCFG.validEmailCLS)) || (!valid && !$(this).hasClass(ECClientCFG.validEmailCLS)))
    			recipients.push( $(this).attr('title') );
    	});
    }
    if (ECClientCFG.encryptBCC){
    	$(bccSel+' .select2-selection__choice').each(function(){
    		if (valid===null || (valid && $(this).hasClass(ECClientCFG.validEmailCLS)) || (!valid && !$(this).hasClass(ECClientCFG.validEmailCLS)))
    			recipients.push( $(this).attr('title') );
   	 	});
    }
    var unique = recipients.filter(function(elem, index, self) {
        return index == self.indexOf(elem);
    });
	if(ECClientCFG.debugEncrypt)log('generateEncryptUsers',unique)
	return unique;
}

//getComposeId(Function handler, String action, Boolean random):jQuery ajax object
function getComposeId(handler,action,random){
	var form = rcmail.gui_objects.messageform;
	var composeid;
	if (random){
		composeid=randomStr(30);
		if (handler) handler(composeid);
		return composeid;
	} else {
		var x=$.ajax({
			type: "POST",
			url: action || form.action,
			data:'_action=compose',
			success: function(data){
				if (data){
					try {
						composeid=data.split('"compose_id":"')[1].split('"',2)[0];
					} catch(e){
						composeid=null;
					}
				}
				handler(composeid);
			}
	     });
		return x;
	}
}

function lockSubmitForm(){
	$('#messagetoolbar .send').addClass('disablemsgtoolbar');
	$('#messagetoolbar .close').addClass('disablemsgtoolbar');
	$('#messagetoolbar .savedraft').addClass('disablemsgtoolbar');
}
function unlockSubmitForm(){
	$('#messagetoolbar .send').removeClass('disablemsgtoolbar');
	$('#messagetoolbar .close').removeClass('disablemsgtoolbar');
	$('#messagetoolbar .savedraft').removeClass('disablemsgtoolbar');
}

//buildRecipients() : void
//Compose mode only, configure all recipient objects
function buildRecipients(){
	if ((rcmail.env.compose_mode || (rcmail.env.task=='mail' && rcmail.env.action=='compose')) && rcmail.env.compose_mode!='forward') {
		var filter=null;
		if (ECClientCFG.autoRemoveSelfFromRecipients && rcmail.env.ec_identities[0].email)filter=[rcmail.env.ec_identities[0].email];
		
		if (rcmail.env.compose_mode=='edit'){
			if (ECClientCFG.toRecipients) {
				createToSelector(ECClientCFG.toRecipients, 'to');
			}
			if (ECClientCFG.ccRecipients) {
				UI.show_header_row('cc');
				createToSelector(ECClientCFG.ccRecipients, 'cc');
			}
			if (ECClientCFG.bccRecipients) {
				UI.show_header_row('bcc');
				createToSelector(ECClientCFG.bccRecipients, 'bcc');
			}
		} else {
			if (rcmail.env.ec_recipients && rcmail.env.ec_recipients.to){
				createToSelector(extractEmails(rcmail.env.ec_recipients.to, undefined, filter), 'to');
			}
			else if (ECClientCFG.fromRecipients && rcmail.env.compose_mode!='draft') {
				createToSelector(ECClientCFG.fromRecipients, 'to');
			}
			else if ($('#_to').val().length>0){
				createToSelector(extractEmails($('#_to').val(), undefined, filter), 'to');
			}
			if (rcmail.env.ec_recipients && rcmail.env.ec_recipients.cc){
				UI.show_header_row('cc');
				createToSelector(extractEmails(rcmail.env.ec_recipients.cc, undefined, filter), 'cc');
			}
			else if (ECClientCFG.ccRecipients) {
				UI.show_header_row('cc');
				createToSelector(ECClientCFG.ccRecipients, 'cc');
			}
			if (rcmail.env.ec_recipients && rcmail.env.ec_recipients.bcc){
				UI.show_header_row('bcc');
				createToSelector(extractEmails(rcmail.env.ec_recipients.bcc, undefined, filter), 'bcc');
			}
			else if (ECClientCFG.bccRecipients) {
				UI.show_header_row('bcc');
				createToSelector(ECClientCFG.bccRecipients, 'bcc');
			}
		}
		
	}
}

/*
 * ATTACHMENTS
 */
function addAttachments(mimeParts, atList){
	if (!atList)atList=$('#attachment-list');
	var ahtmllist=[];
	var alist=[];
	for(var i=0;i<mimeParts.content.attachments.length;i++){
		var aid=mimeParts.content.attachments[i];
		var aheaders=mimeParts.content[aid+'_headers'];
		var cnth=getHeaderByType(aheaders, 'Content-type');
		var cdh=getHeaderByType(aheaders, 'Content-disposition');
		var cte=getHeaderByType(aheaders, 'Content-Transfer-Encoding');
		var isb64=!cte || cte.params['']!='base64' ? false : true;
		var attachment=!isb64 ? mimeParts.content[aid].join('\n') : mimeParts.content[aid].join('');
		var adata=null;
		if (isb64){
			try{
				adata=base64_decode(attachment);
			} catch(e){
				adata=attachment;
			}
		} else adata=attachment;
		var aname=cdh.params['filename'] || cnth.params['name'] || cnthv;
		var size=adata.length;
		var asize=getSizeFormat(size,'~');
		var atype=cnth.params[''];
		var acls=atype.split('/').join(' ');
		var ext=decodeURIComponent(aname).split('.');
		var lastext=ext.pop().toLowerCase();
		aname=html_encode(aname);
		acls=html_encode(acls) + " "+lastext;
		var lij=createAttachment(acls,atype,aname,asize,adata,15,isb64 ? false : true,null,true);
		alist.push(lij);
		var ahtml=createAttachmentHtml(lij,aname,asize,atype,attachment);
		ahtmllist.push(ahtml);
		atList.append(lij);
	}
	return {html:ahtmllist,list:alist};
}

function createAttachment(acls,atype,aname,asize,adata,trimName,binaryDownload,deletehandler,pgpsupport){
	aname=decodeURIComponent(aname);
	
	var name=aname;
	var ext=name.split('.');
	var lastext=ext.pop().toLowerCase();
	
	var li='<li class="'+acls+'" id="'+aname+'">'+
		'<a class="download-attachment-link" href="" title="">'+(aname.length>trimName ? aname.substr(0,trimName)+'...' : aname)+
		' <span class="attachment-size">('+asize+')</span>'+
		'</a>'+
		(deletehandler ? '<a class="delete-attachment-link"><div class="trash-icon"></div></a>' : '') +
		'</li>';
	var lij=$(li);
	
	$('.download-attachment-link', lij).click(function(){
		if (!$('#attachment-list').hasClass('lockdrag')){
			if (pgpsupport && atype=='application/octet-stream' && (lastext=='pgp' || lastext=='asc')){
				name=ext.join('.');
				(function(adata, file, name){
					var isbin=!isPGPTxt(adata);
					decryptVal(isbin ? toBinary(adata) : adata, null, function(r,d){
						file.name=name;
						file.size=r.length;
						file.type+="/"+name.split('.').pop();
						downloadFile(r,file.name,file.type,false);
					}, function(e){
						downloadFile(adata,aname,atype,binaryDownload);
					},isbin);
				})(adata, {name:aname,size:0,type:atype}, name);
			} else {
				downloadFile(adata,aname,atype,binaryDownload);
			}
		}
			
		return false;
	});
	if (deletehandler){
		$('.delete-attachment-link', lij).click(function(){
			deletehandler(lij);
			return false;
		});
	}
	
	return lij;
}
function createAttachmentHtml(aObj,aname,asize,atype,data){
	aname=decodeURIComponent(aname);
	if (isImgContent(atype)){
		var imgH='<p class="image-attachment"></p>';
		var imgHJ=$(imgH);
		var cnt='<a href="" class="image-link" style="width:240px"'+'>'+
			'<img class="image-thumbnail" src="data:'+atype+';base64,'+data+'" title="'+aname+'" alt="'+aname+'" style="max-width:240px; max-height:240px">'+
			'</a>'+
			'<span class="image-filename">'+aname+'</span>'+
			'<span class="image-filesize">'+asize+'</span>'+
			'<span class="attachment-links">'+
			(true ? '' : '<a href="" class="show-image-attachment">'+ecobj.get_label('ec_plugin.att_html_show')+'</a>&nbsp;')+
			'<a href="" class="download-image-attachment">'+ecobj.get_label('ec_plugin.att_html_download')+'</a>'+
			'</span>'+
			'<br style="clear:both">';
		imgHJ.append(cnt);
		$('.download-image-attachment',imgHJ).click(function(){
			$('a', aObj).click();
			return false;
		});
		$('.image-link',imgHJ).click(function(){
			$('a', aObj).click();
			return false;
		});
		return imgHJ;
	}
	
	return null;
}
function verifyAttachmentUpload(mode, mimeParts){
	var ca=$('#compose-attachments');
	var ali=$('#attachment-list');
	var ud=$('#upload-dialog');
	var ua=$('.mainaction', ud);
	ua.attr('value',ecobj.get_label('ec_plugin.upload_att_attach'));
	
	UI._show_uploadform=UI.show_uploadform;
	UI.show_uploadform=function(e){
		if (ECClientCFG.enableAttachmentPopup)
		{
			UI._show_uploadform(e);
		}
		else {
			UI._show_uploadform(e);
			if (!ud.data('hooked')){
				ud.data('hooked',true);
				$('#uploadformFrm input[type=file]').change(function(){
					ua.click();
					try {
						ud.dialog('close');
					} catch(e){
						
					}
				});
			}
			ud.dialog('close');
		}
	};
	
	$('.hint', ud).html(ecobj.get_label('ec_plugin.upload_att_msg').replace('$max_size',getSizeFormat(ECClientCFG.attachmentMaxSize)));
	if (needsEncryption() || ECClientCFG.readUploads){
		ca.get(0).addEventListener('drop',function(e){
			e.preventDefault();
			e.stopPropagation();
			return;
		});
		rcmail._old_file_dropped=rcmail.file_dropped;
		rcmail.file_dropped = function(e){
			var files = e.dataTransfer.files;
			uploadFiles(files);
			$('#compose-attachments').removeClass('hover');
		};
		
		ua.attr('onclick','');
		ua.click(function(event){
			$('#uploadformFrm input[type=file]').each(function(){
				var input=$(this);
				var files=input[0].files;
				uploadFiles(files);
			});
			UI.show_uploadform();
			return false;
		});
		
	}
}
function uploadFiles(files, customcfg, atList){
	if (!customcfg)customcfg=ECClientCFG;
	function onfileread(data, file){
		pushUploadAttachment(data, file, customcfg, atList);
	}
	
	for(var f=0;f<files.length;f++){
		var file=files[f];
		if (file.size>customcfg.attachmentMaxSize){
			var msg = ecobj.get_label('ec_plugin.send_mail_max_size')
			.replace('$max_size',getSizeFormat(customcfg.maxBytes))
			.replace('$cur_size',getSizeFormat(file.size));
			rcmail.display_message(msg,'ec_error',0);
		}
		else {
			readFile(file, onfileread, customcfg.readUploadFormat);
		}
	}
}
function addUploadAttachments(mimeParts, customcfg, atList){
	if (!customcfg)customcfg=ECClientCFG;
	if (customcfg.debugMime)log('addUploadAttachments',mimeParts)
	if (mimeParts && mimeParts.content){
		var atts=mimeParts.content.attachments;
		if (atts){
			for(var a=0;a<atts.length;a++){
				var aid=atts[a];
				var aheaders=mimeParts.content[aid+'_headers'];
				var cnth=getHeaderByType(aheaders, 'Content-type');
				var cdh=getHeaderByType(aheaders, 'Content-disposition');
				var cteh=getHeaderByType(aheaders, 'Content-Transfer-Encoding');
				var adata=null;
				if (cteh && (cteh.params['']=='base64' || !cteh.params[''])){
					try{
						adata=base64_decode(mimeParts.content[aid].join(''));
					} catch(e){
						adata=mimeParts.content[aid].join('\n');
					}
				}
				else adata=mimeParts.content[aid].join('\n');
				var aname=cdh.params['filename'] || cnth.params['name'] || cnthv;
				aname=decodeURIComponent(aname);
				var name=aname;
				var size=adata.length;
				var atype=cnth.params[''];
				var ext=name.split('.');
				var lastext=ext.pop().toLowerCase();
				if (atype=='application/octet-stream' && (lastext=='pgp' || lastext=='asc')){
					name=ext.join('.');
					(function(adata, file, name){
						var isbin=!isPGPTxt(adata);
						decryptVal(isbin ? toBinary(adata) : adata, null, function(r,d){
							file.name=name;
							file.size=r.length;
							file.type+="/"+name.split('.').pop();
							pushUploadAttachment(r, file, customcfg, atList);
						}, function(e){
							pushUploadAttachment(adata, file, customcfg, atList);
						},isbin);
					})(adata, {name:aname,size:size,type:atype}, name);
				}
				else {
					pushUploadAttachment(adata, {name:aname,size:size,type:atype}, customcfg, atList);
				}
			}
		}
	}
}
function pushUploadAttachment(data,file,customcfg,atList){
	if (!customcfg)customcfg=ECClientCFG;
	if (!atList)atList=$('#attachment-list');
	var aname=file.name;
	var size=file.size;
	var asize=getSizeFormat(size,'~');
	var atype=file.type;
	var ext=decodeURIComponent(aname).split('.');
	var lastext=ext.pop().toLowerCase();
	var acls=atype.split('/').join(' ')+' '+lastext;
	aname=html_encode(aname);
	acls=html_encode(acls)
	function ondelete(lij){
		lij.trigger('ec_beforeDeleteAttachment');
		lij.remove();
		customcfg.attachments.splice(customcfg.attachments.indexOf(at),1);
		at.deleted=true;
		rearrangeAttachmentLi(atList);
	}
	
	var lij=createAttachment(acls,atype,aname,asize,data,customcfg.uploadAttachmentNameLength,false,ondelete);
	lij.bind('ec_deleteAttachment', function(e){
		ondelete(lij);
	});
	var css={'padding-right':'0px','padding':'3px 0px 3px 16px','line-height':'14px',
			'position':'relative'
	};
	
	lij.css(css);
	$('.download-attachment-link',lij).css(css);
	var at={file:file,data:data,obj:lij,id:lij.attr('id')};
	customcfg.attachments.push(at);
	atList.append(lij);
	if(!atList.hasClass('sortable')){
		atList.addClass('sortable');
		atList.sortable({revert:true,
			start:function(){
				atList.addClass('lockdrag');
			},
			stop:function(){
			var ids={};
			for(var i=0;i<customcfg.attachments.length;i++){
				ids[customcfg.attachments[i].id]=customcfg.attachments[i];
			}
			customcfg.attachments=[];
			$('li',atList).each(function(){
				var idj=$(this).attr('id');
				customcfg.attachments.push(ids[idj]);
			});
			atList.removeClass('lockdrag');
		}});
	}
	rearrangeAttachmentLi(atList);
	
	return at;
}
function rearrangeAttachmentLi(atList){
	var h=0;
	if (!atList)atList=$('#attachment-list');
	$('li',atList).each(function(){
		var lij=$(this);
		h+=lij.outerHeight();
	});
	atList.height(h);
	if (atList.parent().length>0) atList.parent().trigger('ec_rearrangeAttachmentLi');
}

function verifyAttachmentDownload(mode, mimeParts, customcfg, atList){
	if (!customcfg)customcfg=ECClientCFG;
	if (!atList)atList=$('#attachment-list');
	$('li',atList).each(function(){
		var li=$(this);
		if (li.hasClass('pgp') || li.hasClass('asc') || li.hasClass('pgp-encrypted')){
			$('.drop',li).remove();
			var aj=$('a',li);
			aj.attr('onclick','');
			var ajc=aj.clone();
			$('span',ajc).remove();
			var name=ajc.text().split(' ').join('');
			var iname=name;
			if (iname=='encrypted.asc' && customcfg.emailEncrypted && mimeParts && (!mimeParts.content.attachments || mimeParts.content.attachments.indexOf(iname)==-1)){
				li.remove();
			}
			if (iname=='PGPMIMEversionidentification' && customcfg.emailEncrypted && mimeParts && (!mimeParts.content.attachments || mimeParts.content.attachments.indexOf(iname)==-1)){
				li.remove();
			}
			aj.click(function(e){
				var aj=$(this);
				var ajc=aj.clone();
				$('span',ajc).remove();
				var href=ajc.attr('href')+'&_download=1';
				var ext=name.split('.');
				var lastext=ext.pop().toLowerCase();
				if (lastext=='pgp' || lastext=='asc'){
					name=ext.join('.');
				}
				downloadAttachment(href,name,iname)
				
				return false;
			});
		}
	});
	$('.rightcol .zipdownload').attr('href','').click(function(){
		$('li a',atList).click();
		return false;
	});
}

function downloadAttachment(src,name){
	$.ajax({
		url:src,
		type: "GET",
		dataType: 'text',
        mimeType: 'text/plain; charset=x-user-defined',
		processData: false,
		error:function(){
			showAlert(ecobj.get_label('ec_plugin.alert_fail_decrypt_att'),2000);
			rcmail.location_href(src,window);
		},
		complete:function(r){
			var attachment=r.responseText;
			var adata=attachment;
			if (isPGPTxt(adata)){
				decryptVal(adata, null, function(r,d){
					downloadFile(r,name,'application/octet-stream',true);
				},function(e){
					showAlert(ecobj.get_label('ec_plugin.alert_fail_decrypt_att'),2000);
					rcmail.location_href(src,window);
				},false,'binary');
			} else {
				var bin=toBinary(adata);
				decryptVal(bin, null, function(r,d){
					downloadFile(r,name,'application/octet-stream',true);
				},function(e){
					showAlert(ecobj.get_label('ec_plugin.alert_fail_decrypt_att'),2000);
					rcmail.location_href(src,window);
				},true,'binary');
			}
		}
	});
}
function hasAttachments(customcfg){
	if (!customcfg)customcfg=ECClientCFG;
	return customcfg.attachments && customcfg.attachments.length>0;
}

/*
 * CONTENT EDITOR
 */

function hasSubject(subjO){
	if (!subjO)subjO=$('#compose-subject');
	return subjO.val().length>0;
}
function testHtmlEditorContent(val){
	val=val.split(' ').join('').split(regNL).join('').toLowerCase();
	var sig='<p>&nbsp;</p>'+'<div'+'id="_rc_sig">&nbsp;</div>';
	var p='<p></p>';
	var pa='<p>&nbsp;</p>';
	if (val==sig || val==p || val==pa || val.length==0)return false;
	return true;
}
function hasContent(){
	if (isHtmlEditor()){
		getHtmlEditor().save();
		var val=$("#composebody").val();
		return testHtmlEditorContent(val);
	}
	return $("#composebody").val().length>0;
}

function changeEditor(html){
	rcmail.command('toggle-editor', {id: 'composebody', html: html});
}

function createToSelector(data, type, target, id, custom_checkEncStatus, targetOutputSel, customcfg, comp){
	var cls=type+"Selector";
	if (!customcfg) customcfg=ECClientCFG;
	if (!comp)comp={};
	if (customcfg[cls]){
		customcfg[cls].select2('destroy');
	}
	if (!target)target=$("."+cls);
	customcfg[cls]=target;
	target.bind('toSelector_destroy',function(e){
		customcfg[cls].select2('destroy');
		customcfg[cls]=null;
	});
	var selData=data ? data.concat() : [];
	if (customcfg.autoCacheRecipients)
		selData=selData.concat(extractEmails(localStorage.getItem('cachedRecipients')));
	if (customcfg.autoConcatAddressbook){
		var book=[];
		for(var i=0;i<rcmail.env.ec_addressbook.length;i++){
			var a=rcmail.env.ec_addressbook[i];
			selData.push(a.name && customcfg.supportNotations ? a.name+' <'+a.email[0]+'>' : a.email[0]);
		}
		var unique = selData.filter(function(elem, index, self) {
	        return index == self.indexOf(elem);
	    });
		selData=unique;
	}
	var selcfg={
		tags: true,
		multiple:true,
		data: selData
	};
	if (customcfg.ajaxAddressbook){
		selcfg.ajax= {
		    url: "/?_task=addressbook&_action=export&strict=1&size="+customcfg.ajaxAddressbookSize,
		    dataType: 'json',
		    delay: 250,
		    data: function (params) {
		      return {
		    	search_recipient: Base64.encode(params.term), 
		        page: params.page
		      };
		    },
		    processResults: function (data, params) {
		      var odata=data;
		      var data={};
		      for(var i=0;i<odata.length;i++){
		    	  odata[i].id=odata[i].ID;
		    	  odata[i].text=customcfg.supportNotations && odata[i].name ? odata[i].name+' <'+odata[i].email[0]+'>' : odata[i].email[0];
		    	  odata[i].noremove=odata[i].sourceid!=customcfg.addressbookCollectedId;
		      }
		      data.items=odata;
		      params.page = params.page || 1;
		      
		      return {
		        results: data.items,
		        pagination: {
		          more: (params.page * customcfg.ajaxAddressbookSize) < data.total_count
		        }
		      };
		    }
		  };
		selcfg.language={
			inputTooShort:function (args) {
				var remainingChars = args.minimum - args.input.length;
				var message = ecobj.get_label('ec_plugin.compose_select_default_msg').replace('#CH', remainingChars);
				return message;
		    }
		};
		selcfg.escapeMarkup= function (markup) { return markup; };
		selcfg.minimumInputLength=1;
		var selcfgtemplates=[];
		selcfg.templateResult=function(repo, container){
			if (!repo.email){
				selcfgtemplates=[container];
				if (customcfg.ajaxAddressbookHideInput){
					$(container).css({'display':'none'})
					setTimeout(function(){
						if (selcfgtemplates.length>1){
							$(selcfgtemplates[1]).trigger('mouseenter');
						}
					},0);
				}
				return repo.text ? html_encode(repo.text) : '';
			}
			selcfgtemplates.push(container);
			if (customcfg.ajaxAddressbookHideInput && selcfgtemplates.length==2)$(container).trigger('mouseenter');
			
			var d=customcfg.supportNotations && repo.name ? repo.name+' <'+repo.email[0]+'>' : repo.email[0];
			d=html_encode(d);
			if (container){
				$(container).attr('noremove', repo.noremove ? 0 : 1); 
				if (customcfg.enableDeleteRecipients && !repo.noremove){
					var close='<a class="select2-selection__ec_option__remove"'+
					'>×</a>';
					d+=close;
					setTimeout(function(){
						$('.select2-selection__ec_option__remove', container).mousedown(function(e){
							e.stopImmediatePropagation();
							e.preventDefault();
							if (customcfg.autoRemoveRecipients){
								removeOptionRemote(repo, container);
								selector.select2('close');
							}
							return true;
						});
					},0);
				}
			}
			var vcardobj=repo.vcard ? decodeVCard(repo.vcard) : null;
			var img='';
			if (vcardobj){
				if (vcardobj.PHOTO && vcardobj.PHOTO.V) img='<img class="vcard_selectimg" src="data:image/jpg;base64,'+vcardobj.PHOTO.V+'"/>';
			}
			d=img+d;
			return d;
		};
		selcfg.templateSelection=function(repo){
			if (!repo.email)return repo.text ? html_encode(repo.text) : '';
			var d=customcfg.supportNotations && repo.name ? repo.name+' <'+repo.email[0]+'>' : repo.email[0];
			return html_encode(d);
		};
	}
	
	var selector=target.select2(selcfg);
	
	if (customcfg.recipientEditMode){
		setTimeout(function(){
			var realsize=$('<div></div>');
			topstruct.append(realsize);
			
			var intid=setInterval(function(){
				var sf=$('.select2-search__field', topstruct);
				var ssli=$('.select2-search', topstruct);
				var ssul=$('.select2-selection__rendered',topstruct);
				var ssulw=ssul.width();
				realsize.text(sf.val());
				var cs=window.getComputedStyle( sf[0] );
				realsize.css({'font-size':cs['font-size'],'font':cs['font'],'float':'left','width':'auto','display':'none'});
				ssli.width(realsize.width()+12);
				ssli.width(ssulw-ssli.position().left-10);
				topstruct.trigger('select2_adjust');
			}, 100);
			target.bind('toSelector_destroy', function(e){
				window.clearInterval(intid);
			});
			
			topstruct.on('dblclick','.select2-selection__choice',function(){
				var item=$(this);
				item.trigger('FloatingTooltip_destroy');
				item.addClass('ec_select2_editmode');
				var inp='<input class="dynamic_select2_edit" type="text" value="'+item.attr('title')+'" style="border: none !important; width: 260px; padding: 0px !important; margin: 0px !important; display: inline; background: none;"/>';
				var del=$('.select2-selection__choice__remove',item);
				item.empty();
				item.append(del).append(inp);
				var jinp=$('.dynamic_select2_edit',item);
				jinp.keydown(function(e){
					e.stopImmediatePropagation();
					if (e.keyCode==9){
						e.preventDefault();
						jinp.blur();
						return false;
					}
					if (e.keyCode==13){
						jinp.blur();
					}
				}).keyup(function(e){
					e.stopImmediatePropagation();
				}).keypress(function(e){
					e.stopImmediatePropagation();
				}).mousedown(function(e){
					e.stopImmediatePropagation();
				}).click(function(e){
					e.stopImmediatePropagation();
				}).blur(function(){
					var newv=jinp.val();
					item.attr('title',newv);
					item.removeClass('ec_select2_editmode');
					if (newv.length==0) del.click();
					else {
						var d=item.data().data;
						d.element.text=newv;
						d.text=newv;
						var ee=extractEmails(newv,true,null,2);
						if (ee[0]){
							d.name=ee[0][0] || '';
							if (!d.email)d.email=[];
							d.email[0]=ee[0][1] || '';
						} else {
							d.name='';
							delete d.email;
						}
						var newid=randomStr(6);
						d.ID+='_'+newid;
						d.id+='_'+newid;
						d.contact_id+='_'+newid;
						d.element.value=d.id;
						item.empty();
						item.append(del).append(html_encode(newv));
						updateColors();
					}
				}).focus();
			});
		},0);
	}
	
	if (data && data.length>0 && customcfg.autoCacheRecipients)pushRecipientsToLocalStorage(data);
	var topstruct=$('.select2-container', selector.parent());
	topstruct.addClass(cls);
	if (!id)id=type+'Select2Container';
	topstruct.attr('id',id);
	var emails='';
	var ecache={};
	function handler(e,s,x){
		if (e) ecache[e]=s ? {s:s,x:x} : false;
		checkStatus();
		topstruct.trigger('select2_updateColors');
	}
	function checkStatus(){
		var emailsSpl=emails.length==0 ? [] : emails.split(',');
		var status=-1;
		var em=0;// number of emails
		var emy=0;// number of valid emails
		for(var key in emailsSpl){
			em++;
			if (ecache[emailsSpl[key]])emy++;
		}
		
		if (em==0)status=-1;// no input
		else if (emy==0)status=0;// no valid emails
		else if (emy==em)status=2;// all emails are valid
		else status=1;// some emails are valid
		customcfg['rec'+type+'Status']=status;// save status according to field
		
		// adjust main status
		if (customcfg.rectoStatus==-1 && customcfg.recccStatus==-1 && customcfg.recbccStatus==-1)status=-1;// no input
		else if ((customcfg.rectoStatus==0 || customcfg.rectoStatus==-1) &&
				(customcfg.recccStatus==0 || customcfg.recccStatus==-1) && 
				(customcfg.recbccStatus==0 || customcfg.recbccStatus==-1))status=0;// all emails, if any are not valid
		else if (customcfg.rectoStatus==2 && 
				(customcfg.recccStatus==2 || customcfg.recccStatus==-1) && 
				(customcfg.recbccStatus==2 || customcfg.recbccStatus==-1))status=2;// all emails, if any are valid
		else status=1;// some fields contain some valid emails
		customcfg.recStatus=status;
		if (custom_checkEncStatus) custom_checkEncStatus(customcfg);
		else checkEncStatus(customcfg);
	}
	var tid;
	function updateColors(e) {
		if (tid) window.clearTimeout(tid);
		tid=setTimeout(function(){
			if (!targetOutputSel)targetOutputSel='#_'+type;
			var to = $(targetOutputSel).val();
			var recipients=[];
			$('#'+id+' .select2-selection__choice').each(function(){
		    	recipients.push( $(this).attr('title') );
			});
			var cem=recipients.join(',');
			var eam=extractEmails(cem);
			var eamj=eam.join(',');
			$(targetOutputSel).val(eamj);
			
			if (emails!=eamj){
				emails=eamj;
				checkStatus();
			}
			$('#'+id+' .select2-selection.select2-selection--multiple ul> li.select2-selection__choice').each(function (key, container) {
				var email = $(container).attr('title');
				var ise=rcube_check_email(extractEmails(email,false)[0]);
				if(customcfg.debugEncrypt)log(email,ise);
				if (ise){
					if (ecache[email]!==undefined){
						$(container).removeClass(customcfg.validEmailCLS);
						$(container).removeClass(customcfg.externalEmailCLS);
						if (ecache[email]) {
							$(container).css(customcfg.validEmailCSS).addClass(customcfg.validEmailCLS);
							if (ecache[email].x)$(container).addClass(customcfg.externalEmailCLS);
						}
						else $(container).css(customcfg.unknownEmailCSS);
						updateRecipientBoxTooltip($(container), customcfg);
					}
					else {
						updateColor($(container),handler,customcfg);
					}
				} else {
					$(container).css(customcfg.invalidEmailCSS);
					updateRecipientBoxTooltip($(container), customcfg);
					showAlert(ecobj.get_label('ec_plugin.input_invalid_email')+email,2000,'email_'+email);
					if (customcfg.removeNonEmailsOnChange){
						setTimeout(function(){
							$('.select2-selection__choice__remove',$(container)).click();
							target.select2('close');
						},0);
					}
				}
			});
			topstruct.trigger('select2_updateColors');
		}, 0);
	}
	
	function removeOption(id){
		var o=$("option",target);
		for(var i=0;i<o.length;i++){
			var top=$(o.get(i));
			if (top.attr('value')==(id)){
				top.remove();
				removeRecipientFromLocalStorage(id);
				break;
			}
		}
	}
	function removeOptionRemote(data, option, h){
		var x=$.ajax({
			type: "POST",
			url:'/?_task=addressbook&_action=delete',
			data:'_remote=1&_cid='+data.contact_id+'&_source='+data.sourceid,
			success: function(rdata){
				if (h) h(rdata,data,option);
			}
		});
	}

	topstruct.on('focusout',function(e,d){
//		target.trigger("change");
	});

	topstruct.on('add_value',function(e,d){
		var option = new Option(d,d);
		option.selected = true;
		target.append(option);
		target.trigger("change");
	});
	target.on('select2:noresults_custom1',function(e,d){
		var s=$('.select2-search__field', topstruct);
		var sv=s.val();
		if (sv){
			s.val('');
			topstruct.trigger('add_value',sv);
		}
	});
	target.on('select2:selection_blur_custom1',function(e,d){
		setTimeout(function(){
			var s=$('.select2-search__field', topstruct);
			var sv=s.val();
			if (sv && !s.is(':focus')){
				s.val('');
				topstruct.trigger('add_value',sv);
			}
		},0);
		
	});
	target.on("select2:open",function(e){
		if (!customcfg.enableDeleteRecipientsOnOpen)return;
		var close='<a class="select2-selection__ec_option__remove"'+
		'>×</a>';
		setTimeout(function(){
		$('.select2-results__option').each(function(){
			var t=$(this);
			if (t.attr('aria-live'))return;
			var h=t.html();
			t.append(close);
			$('.select2-selection__ec_option__remove',t).mousedown(function(e){
				e.stopImmediatePropagation();
				e.preventDefault();
				if (customcfg.autoRemoveRecipients){
					removeOption(html_decode(h));
					selector.select2('close');
				}
				return true;
			});
		});
		},0);
	});
	
	target.on("select2:select", function(e){
		var id=e.params.data.text;
		$('.select2-search__field', topstruct).val('');
	});
	target.on("select2:close", function(e){
		updateColors();
	});
	target.on("select2:unselect", function(e){
		var id=e.params.data.text;
	});
	target.on("change", function(){
		updateColors();
	});
	topstruct.bind('blur', function(e){
		target.select2('close');
		var s=$('.select2-search__field', topstruct);
		var sv=s.val();
		if (sv && !s.is(':focus')){
			s.val('');
			topstruct.trigger('add_value',sv);
		}
		// target.trigger("change");
		// //e.stopImmediatePropagation();
		// return false;
	});
	topstruct.keyup(function(e){
		if (e.keyCode==9){
			if (comp.skipTabKey){
				selector.select2('close');
				if (e.shiftKey){
					if (comp.prevF) comp.prevF.focus();
					else $('#_from').focus();
				}
				else {
					if (comp.nextF) comp.nextF.focus();
					else $('#compose-subject').focus();
				}
				e.stopImmediatePropagation();
				return false;
			}
		}
	});
	if (data){
		target.val(data);
		target.trigger('change');
		updateColors();
	}
	checkStatus();
}

function updateColor(container,handler,customcfg) {
	var email=container.attr('title');
	var ks=new requestKeyStatus(email, function(e,v,x){
		container.removeClass(customcfg.validEmailCLS);
		container.removeClass(customcfg.externalEmailCLS);
		if (v){
			container.css(customcfg.validEmailCSS).addClass(customcfg.validEmailCLS);
			if (x[e] && x[e].external)container.addClass(customcfg.externalEmailCLS);
			if (handler)handler(email, true, x[e] ? x[e].external : null);
		} else {
			container.css(customcfg.unknownEmailCSS);
			if (handler)handler(email, false);
		}
		updateRecipientBoxTooltip(container,customcfg);
	});
}
function updateRecipientBoxTooltip(container,customcfg){
	if (customcfg.recipientBoxTooltips && !container.hasClass('ec_select2_editmode')){
		var cdata=container.data('data');
		var vcardobj=cdata.vcard ? decodeVCard(cdata.vcard) : null;
		var img='';
		if (vcardobj){
			if (vcardobj.PHOTO && vcardobj.PHOTO.V) img='<img class="vcard_tooltipimg" src="data:image/jpg;base64,'+vcardobj.PHOTO.V+'"/>';
		}
		if (container.hasClass(customcfg.externalEmailCLS)){
			new FloatingTooltip(container,img+ecobj.get_label('ec_plugin.recbox_eenc_tt').replace('<email>','<b>'+html_encode(container.attr('title'))+'</b>'),true,true,'valid-enc-tooltip');
		} else if (container.hasClass(customcfg.validEmailCLS)){
			new FloatingTooltip(container,img+ecobj.get_label('ec_plugin.recbox_enc_tt').replace('<email>','<b>'+html_encode(container.attr('title'))+'</b>'),true,true,'valid-enc-tooltip');
		} else {
			new FloatingTooltip(container,img+ecobj.get_label('ec_plugin.recbox_nenc_tt').replace('<email>','<b>'+html_encode(container.attr('title'))+'</b>'),true,true);
		}
	}
}
function checkEncStatus(customcfg, statusO, addpkeyO, label, encO) {
	if (!customcfg) customcfg=ECClientCFG;
	var s=statusO || $('#_ec_enc_status');
	var msg='';
	var cls;
	if (!encO) encO=$('#ec_rcmcomposeenc');
	if (!addpkeyO)addpkeyO=$('#composeoptions .composeoption-addpkey');
	s.removeClass('color-red'); s.removeClass('color-dark-blue'); s.removeClass('nopointercheckbox');
	if (!label)label=encO.parent();
	var topstr=encO.parent().parent();
	topstr.removeClass('encstatedef'); topstr.removeClass('encstate0'); topstr.removeClass('encstate1'); topstr.removeClass('encstate2');
	label.removeClass('nopointercheckbox');
	if (customcfg.autoEncrypt || needsEncryption(customcfg, encO)){
		var rs=customcfg.recStatus;
		switch(rs){
			case 2:
				setEncryption(true, encO);
				msg = ecobj.get_label('ec_plugin.enc_status_all_enc');
				addpkeyO.hide();
				topstr.addClass('encstate2');
				break;
			case 1:
				setEncryption(true, encO);
				msg = ecobj.get_label('ec_plugin.enc_status_selective_enc');
				cls='color-red';
				addpkeyO.show();
				topstr.addClass('encstate1');
				break;
			case 0:
				setEncryption(false, encO);
				msg = ecobj.get_label('ec_plugin.enc_status_no_enc');
				cls='color-red';
				label.addClass('nopointercheckbox');
				addpkeyO.show();
				topstr.addClass('encstate0');
				break;
			case -1:
			default:
				setEncryption(false, encO);
				msg = "";
				label.addClass('nopointercheckbox');
				addpkeyO.hide();
				topstr.addClass('encstatedef');
				break;
		}
	}
	else {
		msg = ecobj.get_label('ec_plugin.enc_status_no_enc');
		cls='color-red';
		topstr.addClass('encstate0');
	}
	if (customcfg.allowPublicKeyForEncrypted)addpkeyO.show();
	s.addClass(cls);
	s.html(msg);
}
function needsEncryption(customcfg, encobj) {
	if (!customcfg)customcfg=ECClientCFG;
	if (customcfg.enforceEncryptSend)return true;
	if (customcfg.enforceNonencryptSend)return false;
	var enc = encobj || $('#ec_rcmcomposeenc');
	return enc.get(0) && enc.get(0).checked ? true : false;
}
function setEncryption(flag, encobj){
	var enc = encobj || $('#ec_rcmcomposeenc');
	try{
	enc.get(0).checked=flag;
	} catch(e){}
}

function isHtmlEditor() {
	if (getHtmlEditor()) return true;
	return false;
}
function getHtmlEditor() {
	if (!rcmail.editor) return null;
	var htmlEditor=rcmail.editor.editor || tinyMCE.get(rcmail.env.composebody);
	try{
		htmlEditor.getBody();
	}
	catch(e){
		return null;
	};
	return htmlEditor;
}
function isHtmlEditorSelect() {
	return $('[name="editorSelector"]').val()=='html';
}

/*
 * INIT
 */

function updateTo() {
	var select = '<select id="user_emails" multiple="multiple"  class="toSelector" style="width: 100%" >'+
	'</select>';
	$("#_to").hide();
	$("#_to").parent().append(select);
	createToSelector(null, 'to');
	select = '<select id="bcc_emails" multiple="multiple"  class="bccSelector" style="width: 100%" >'+
	'</select>';
	$("#_bcc").hide();
	$("#_bcc").parent().append(select);
	createToSelector(null, 'bcc');
	select = '<select id="cc_emails" multiple="multiple"  class="ccSelector" style="width: 100%" >'+
	'</select>';
	$("#_cc").hide();
	$("#_cc").parent().append(select);
	createToSelector(null, 'cc');
	
	$('.rightcol').show();
	new requestKeyStatus().clearKeyCache();
	if (rcmail.env.compose_mode) {
		decryptEmailMixed('input');
		if (ECClientCFG.autoMarkRead){
			try{
				if (rcmail.is_framed || rcmail.env.extwin)rcmail.opener().mark_message('read',rcmail.env.uid)
				else rcmail.mark_message('read',rcmail.env.uid)
			} catch(e){
				
			}
		}
	}
	else {
		$('#composebody').removeClass('hidden').addClass('visible');
		$('#composebody').focus();
		verifyAttachmentUpload();
		buildRecipients();
		if (ECClientCFG.htmlEdit && ECClientCFG.enforceHTMLParams){
			$("#composebody").val('');
			changeEditor(true);
		}
	}
	$('#compose-subject').keydown(function(e){
		if (e.keyCode==9){
			e.preventDefault();
			try {
				getHtmlEditor().focus();
			} catch(e){
				
			}
			return false;
		}
	});
}

function configureEncryptCheckbox(t, checkEncStatus, needsEncryption, ECClientCFG){
	t.change(function(){
		checkEncStatus();
	});
	t.click(function(){
		if (needsEncryption(ECClientCFG, t))ECClientCFG.autoEncrypt=true;
		else ECClientCFG.autoEncrypt=false;
		checkEncStatus();
	});
}

function configurePKeyAttachment(t, identHandler, customcfg, atList){
	var pkeyattachment=null;
	t.change(function(){
		var s=$(this).get(0).checked;
		if (s){
			getEmailKey(identHandler(),function(e,k){
				var file={name:e.replace('@','_at_')+'_pub.asc', size:getStringByteSize(k), type:'application/pgp-keys'};
				pkeyattachment=pushUploadAttachment(k,file,customcfg,atList);
				pkeyattachment.obj.bind('ec_beforeDeleteAttachment', function(e){
					t.get(0).checked=false;
				});
			});
		} else {
			if (pkeyattachment && !pkeyattachment.deleted){
				pkeyattachment.obj.trigger('ec_deleteAttachment');
				pkeyattachment=null;
			}
		}
	});
}

function initComposeOptions() {
	if (rcmail.env.action!='compose')return;
	
	var checkVal = ECClientCFG.autoEncrypt ? 'checked="1"' : '';
	var encOption = '<span class="composeoption composeoption-encrypt">'+
	'<label>'+
	'<input name="_ec_enc" id="ec_rcmcomposeenc" tabindex="4" ' + checkVal + ' value="1" type="checkbox">'+
	' '+ecobj.get_label('ec_plugin.comopt_encrypt')+
	'</label>'+
	'<font id="_ec_enc_status"></font>'+
	'</span>';
	$('#composeoptions').append(encOption);
	configureEncryptCheckbox($('#ec_rcmcomposeenc'), checkEncStatus, needsEncryption, ECClientCFG);
	
	if (ECClientCFG.enablePublicKeyAttachment){
		var addPublicKey='<span class="composeoption composeoption-addpkey">'+
		'<label for="ec_addpkey">'+
		'<input name="_ec_addpkey" id="ec_addpkey" tabindex="4" value="0" type="checkbox">'+
		' '+ecobj.get_label('ec_plugin.addpkey')+
		'</label>'+
		'</span>';
		var addpkeyJ=$(addPublicKey);
		$('#composeoptions').append(addpkeyJ);
		configurePKeyAttachment($('#ec_addpkey'), function(){
			return rcmail.env.ec_identities[0].email;
		});
	}
		
	var htmlOption = '<span class="composeoption composeoption-html">'+
	'<input name="_ec_ishtml" id="ec_rcmcomposehtml" tabindex="4" value="" type="hidden">'+
	'</span>';
	$('#composeoptions').append(htmlOption);
	var _ec_forward_uid = '<span class="composeoption composeoption-_ec_forward_uid">'+
	'<input name="_ec_forward_uid" id="_ec_forward_uid" tabindex="4" value="" type="hidden">'+
	'</span>';
	$('#composeoptions').append(_ec_forward_uid);
	var _ec_reply_uid = '<span class="composeoption composeoption-_ec_reply_uid">'+
	'<input name="_ec_reply_uid" id="_ec_reply_uid" tabindex="4" value="" type="hidden">'+
	'</span>';
	$('#composeoptions').append(_ec_reply_uid);
	var _ec_mbox = '<span class="composeoption composeoption-_ec_mbox">'+
	'<input name="_ec_mbox" id="_ec_mbox" tabindex="4" value="" type="hidden">'+
	'</span>';
	$('#composeoptions').append(_ec_mbox);
	var _ec_type = '<span class="composeoption composeoption-_ec_type">'+
	'<input name="_ec_type" id="ec_type" tabindex="4" value="" type="hidden">'+
	'</span>';
	$('#composeoptions').append(_ec_type);
	
	var boundaryOption = '<span class="composeoption composeoption-boundary">'+
	'<input name="_ec_boundary" id="ec_rcmcomposeboundary" tabindex="4" value="" type="hidden">'+
	'</span>';
	$('#composeoptions').append(boundaryOption);
	
	$('[name=_store_target]').parent().parent().hide();
	$('[name=editorSelector]').parent().parent().hide();
	$('#rcmcomposedsn').parent().parent().hide();
	$('#rcmcomposereceipt').parent().parent().hide();
	
	
	$('.editfield .edit').hide();
	
	if (!$('#composeoptionstoggle').hasClass('remove')){
		$('#composeoptionstoggle').click();
	}
	$('#composeoptionstoggle').css({'pointer-events':'none'});
	$('#rcmcomposepriority').parent().parent().remove();
	
	$('#composeoptions').addClass("ec-composeoptions").insertAfter('#_from');
	
	$('#compose-replyto').remove();
	$('#compose-followupto').remove();
	$('#replyto-link').remove();
	$('#followupto-link').remove();
	
	$('#messagetoolbar .close').text(rcmail.get_label('ec_plugin.abort'));
}

/*
 * CUSTOM COMPOSE COMPONENTS
 */

var ec_composeWindows=[];
function customComposeFromRC(p){
	if (!ec_composeWindows._initBinds){
		ec_composeWindows._initBinds=true;
		$(window).bind('ec_compose_render', function(){
			alignCustomCompose();
		});
		$(window).bind('resize', function(){
			for(var i=0;i<ec_composeWindows.length;i++){
				if (!ec_composeWindows[i].closed){
					ec_composeWindows[i].resize();
				}
			}
		});
	}
	
	var comp=null;
	if (ec_composeWindows.length>=ECClientCFG.maxCustomCompose){
		for(var i=0;i<ec_composeWindows.length;i++){
			comp=ec_composeWindows[i];
			if (comp.closed){
				comp.options={p:p};
				mediateECCompose(comp);
				comp.open();
				if (ECClientCFG.composeMaximizedStart) comp.maximize();
				comp.focus();
				comp.expandRecipientsUI();
				break;
			}
		}
	} else {
		comp=new EC_Compose(null, rcmail, {p:p});
		mediateECCompose(comp);
		setTimeout(function(){
			comp.init();
			comp.open();
			if (ECClientCFG.customComposeDelay){
				comp.hide();
				setTimeout(function(){
					comp.show();
					if (ECClientCFG.composeMaximizedStart) comp.maximize();
					comp.focus();
					comp.expandRecipientsUI();
				}, ECClientCFG.customComposeDelay)
			}
		},0);
		ec_composeWindows.push(comp);
	}
	return comp;
}
function alignCustomCompose(){
	var pos=0;
	var space=5;
	for(var i=0;i<ec_composeWindows.length;i++){
		var cc=ec_composeWindows[i];
		if (!cc.closed && cc.uiWindow && !cc.isMaximized()){
			cc.uiWindow.css('right',pos+'px');
			pos+=cc.uiWindow.width()+space;
		}
	}
}

/*BEGIN COMPOSE MEDIATORS*/
function mediateECCompose(comp){
	comp.resetMediators();
	if (comp.options.p._draft_uid || comp.options.p._reply_uid || comp.options.p._forward_uid) comp.newMediator(EC_ComposeDefaultMediator);
	else comp.newMediator(EC_ComposeNewMediator);
	if (comp.options.p._draft_uid){
		comp.newMediator(EC_ComposeDraftMediator);
	} else if (comp.options.p._reply_uid){
		comp.newMediator(EC_ComposeReplyMediator);
	} else if (comp.options.p._forward_uid){
		comp.newMediator(EC_ComposeForwardMediator);
	}
}

function __ternMedInitJHxI(){
	new EC_ComposeDefaultMediator();
	new EC_ComposeNewMediator();
	new EC_ComposeDraftMediator();
	new EC_ComposeReplyMediator();
	new EC_ComposeForwardMediator();
}

function EC_ComposeDefaultMediator(eccomp){
	var m=this;
	m.eccomp=eccomp;
	m.open=function(){
		m.eccomp.load();
		m.eccomp.setHeaderTitle('<div class="spinner"></div>'+ecobj.get_label('ec_plugin.ccompose_loading'));
	};
	m.constructor=function(){
		
	};
	m.onload=function(){
		m.eccomp.cloneCFG.alwaysUseSource=true;
		m.eccomp.cloneCFG.decryptMode='input';
		m.eccomp.cloneCFG.decryptOptions={};
		var comp={};
		comp.isHtmlEditor=function(){return true;};
		comp.isHtmlEditorSelect=function(){return true;};
		comp.buildRecipients=function(){
			if (comp.env.compose_mode=='reply'){
				if (m.eccomp.data.replyAll){
					m.eccomp.setTo(m.eccomp.cloneCFG.fromRecipients.concat(m.eccomp.cloneCFG.toRecipients));
					m.eccomp.setCC(m.eccomp.cloneCFG.ccRecipients);
					m.eccomp.setBCC(m.eccomp.cloneCFG.bccRecipients);
				} else {
					m.eccomp.setTo(m.eccomp.cloneCFG.fromRecipients);
				}
			} else if (comp.env.compose_mode=='draft'){
				m.eccomp.setTo(m.eccomp.cloneCFG.toRecipients);
				m.eccomp.setCC(m.eccomp.cloneCFG.ccRecipients);
				m.eccomp.setBCC(m.eccomp.cloneCFG.bccRecipients);
			}
			
			m.eccomp.checkEncStatus();
		};
		comp.setInputSubject=function(v){
			if (comp.env.compose_mode=='reply')v=m.eccomp.cloneCFG.replySubjectPrefix+v;
			else if (comp.env.compose_mode=='forward')v=m.eccomp.cloneCFG.forwardSubjectPrefix+v;
			m.eccomp.setSubject(v);
		};
		comp.noDecryptPreformat=function(){};
		comp.env={};
		if (m.eccomp.data.draft_uid){
			comp.env.compose_mode='draft';
			m.eccomp.setDraftUid(m.eccomp.data.draft_uid);
		}
		else if (m.eccomp.data.reply_uid){
			comp.env.compose_mode='reply';
			m.eccomp.setReplyUid(m.eccomp.data.reply_uid);
		}
		else if (m.eccomp.data.forward_uid){
			comp.env.compose_mode='forward';
			m.eccomp.setForwardUid(m.eccomp.data.forward_uid);
		}
		comp.atList=$('.ec_compose_attachments .ec_compose_list', m.eccomp.uiWindow);
		comp.activateSafeMode=function(){};
		comp.verifyAttachmentUpload=function(){};
		comp.inputAfterFormat=function(){};
		comp.finalInputPreformat=function(){
			switch(comp.env.compose_mode){
			case 'reply':
				m.eccomp.setHeaderTitle(ecobj.get_label('ec_plugin.ccompose_htitler'));
				break;
			case 'forward':
				m.eccomp.setHeaderTitle(ecobj.get_label('ec_plugin.ccompose_htitlef'));
				break;
			case 'draft':
				m.eccomp.setHeaderTitle(ecobj.get_label('ec_plugin.ccompose_htitled'));
				break;
			}
			
		};
		comp.getHtmlEditor=function(){
			return m.eccomp.components.editor.editor;
		};
		
		startDecrypt(m.eccomp.cloneCFG, comp);
	};
	
	return m;
}

function EC_ComposeNewMediator(eccomp){
	var m=this;
	m.eccomp=eccomp;
	m.open=function(){
		if (m.eccomp.options.p._to){
			m.eccomp.setTo(m.eccomp.options.p._to.split(','));
			m.eccomp.checkEncStatus();
		}
	};
	m.constructor=function(){
		
	};
	return m;
}

function EC_ComposeDraftMediator(eccomp){
	var m=this;
	m.eccomp=eccomp;
	m.resetData=function(){
		m.eccomp.data.draft_uid=m.eccomp.options.p._draft_uid;
		m.eccomp.data.uid=m.eccomp.data.draft_uid;
		m.eccomp.data.mbox=m.eccomp.options.p._mbox;
	};
	m.constructor=function(){
		
	};
	return m;
}

function EC_ComposeReplyMediator(eccomp){
	var m=this;
	m.eccomp=eccomp;
	m.resetData=function(){
		eccomp.data.reply_uid=eccomp.options.p._reply_uid;
		if (eccomp.options.p._all)eccomp.data.replyAll=true;
		m.eccomp.data.mbox=m.eccomp.options.p._mbox;
		m.eccomp.data.uid=m.eccomp.data.reply_uid;
	};
	m.constructor=function(){
		
	};
	return m;
}

function EC_ComposeForwardMediator(eccomp){
	var m=this;
	m.eccomp=eccomp;
	m.resetData=function(){
		eccomp.data.forward_uid=eccomp.options.p._forward_uid;
		m.eccomp.data.mbox=m.eccomp.options.p._mbox;
		m.eccomp.data.uid=m.eccomp.data.forward_uid;
	};
	m.constructor=function(){
		
	};
	return m;
}
/*END COMPOSE MEDIATORS*/

//ECEmailFormData(String id, String title, String recipients, String text, Bool enc, String mbox, String from, Boolean textDirect) : Object
function ECEmailFormData(id, title, recipients, text, enc, mbox, from, textDirect){
	this.serialize=function(){
		return serializeURLParams(d);
	};
	
	var d={};
	this.data=d;
	d._subject=title;
	d._to=recipients;
	d._is_html='0';
	if (enc) d._ec_enc='1';
	d._token=rcmail.env.request_token;
	d._id=id;
	d._ec_mbox=mbox || rcmail.env.mailbox;
	d._ec_ishtml='1';
	if (!enc && !textDirect){
		var mimeEmail=wrapMimeBody(text, text, null, null, true, true);
		d._ec_boundary=mimeEmail.ab;
		d._message=mimeEmail.body;
	} else {
		d._message=text;
	}
	d._ec_type='alt';
	d._action="send";
	d._task='mail';
	d._from=from || rcmail.env.ec_identities[0].ident;
	d.editorSelector='html';
	
	return this;
}

//EC_Compose(ECClientCFG cfg=null, rcmail rcmail, Object options) : Object
function EC_Compose(cfg, rcmail, options){
	var o=this;
	
	o.inited=false;
	o.destroyed=false;
	o.closed=true;
	o.templates={};
	o.options=options;
	o.rcmail=rcmail;
	o.uid=randomStr(6);
	o.cfg=cfg || ECClientCFG;
	o.cloneCFG=null;
	o.components={};
	o.element=$('<div></div>');
	o.element.attr('id',o.uid);
	o.data=null;
	o.mediators=[];
	o.uiWindow=null;
	
	o.resetMediators=function(){
		o.callMeds('resetMediators');
		o.mediators=[];
	};
	o.newMediator=function(med){
		var medi=new med(o);
		o.mediators.push(medi);
		return o;
	};
	o.callMeds=function(call){
		for(var i=0;i<o.mediators.length;i++){
			try{
				o.mediators[i][call]();
			}catch(e){}
		}
		return o;
	};
	o.resetData=function(){
		o.data={subject:'',text:'',to:'',cc:'',bcc:'',attachments:[],enc:false,from:'',boundary:'',type:'',uid:'',reply_uid:'',replyAll:false,forward_uid:'',draft_uid:'',mbox:''};
		o.cloneCFG.attachments=o.data.attachments;
		o.callMeds('resetData');
		return o;
	};
	o.constructor=function(){
		o.destroyed=false;
		o.resetCFG();
		o.resetData();
		o.callMeds('constructor');
		return o;
	};
	o.destroy=function(){
		o.destroyed=true;
		o.inited=false;
		o.close();
		o.cloneCFG=null;
		o.callMeds('destroy');
		return o;
	};
	o.initTemplates=function(){
		o.templates.window=$('<div class="ec_compose_window"></div>');
		o.templates.header=$('<div class="ec_compose_header"></div>');
		o.templates.header.append($('<span class="ec_compose_headertitle"></span>'))
			.append('<a class="ec_compose_headerclose"></a>')
			.append('<a class="ec_compose_headermax"></a>')
			.append('<a class="ec_compose_headermin"></a>');
		o.templates.attachmentsArea=$('<div class="ec_compose_attachmentsArea"></div>');
		o.templates.textArea=$('<div class="ec_compose_text"><textarea class="ec_compose_textarea"></textarea></div>');
		o.templates.inputArea=$('<div class="ec_compose_input"><input class="ec_compose_inputarea" type="text"/></div>');
		o.templates.selectArea=$('<div class="ec_compose_selectarea"><select class="ec_compose_select"/></div>');
		o.templates.option=$('<option></option>');
		o.templates.labelArea=$('<div class="ec_compose_labelarea"><label class="ec_compose_label"></label></div>');
		o.templates.fromField=$('<div class="ec_compose_fromField"></div>');
		o.templates.fromField.append(o.templates.labelArea.clone()).append(o.templates.selectArea.clone());
		o.templates.recField=$('<div class="ec_compose_recField"></div>');
		o.templates.recField.append(o.templates.labelArea.clone()).append(o.templates.textArea.clone());
		o.templates.recFieldSummary=$('<div class="ec_compose_recFieldSummary"></div>');
		o.templates.recFieldSummary.append(o.templates.labelArea.clone()).append(o.templates.textArea.clone());
		o.templates.subjectField=$('<div class="ec_compose_subjectField"></div>');
		o.templates.subjectField.append(o.templates.labelArea.clone()).append(o.templates.inputArea.clone());
		o.templates.form=$('<form class="ec_compose_form"></form>');
		o.templates.buttonArea=$('<div class="ec_compose_buttonarea"><a class="ec_compose_button"></a></div>');
		o.templates.hseparator=$('<div class="ec_compose_hseparator"></div>');
		o.templates.fader=$('<div class="ec_compose_bg_fader"></div>');
		o.templates.checkboxArea=$('<span class="ec_compose_checkboxarea"><label class="ec_compose_checkbox_label"><input class="ec_compose_checkbox" type="checkbox"></label><font class="ec_compose_option_font"></font></span>');
		o.templates.container=$('<div class="ec_compose_container"></div>');
		o.templates.listArea=$('<div class="ec_compose_listarea"><ul class="ec_compose_list"></ul></div>');
		o.templates.listItem=$('<li class="ec_compose_listitem"></li>');
		o.templates.hiddenInput=$('<input class="ec_compose_hiddeninput" type="hidden">');
		o.callMeds('initTemplates');
		return o;
	};
	o.getHtmlTemplate=function(id, data, handler){
		if (o.templates[id]){
			var templ=o.templates[id].clone();
			if (handler)handler(templ, data);
			return templ;
		}
		return null;
	};
	o.resetCFG=function(){
		o.cloneCFG=new ECClientCFGObj({cfg:o.cfg}).cloneCfg();
		o.cloneCFG.uploadAttachmentNameLength=60;
		o.cloneCFG.localQueue=false;
		o.callMeds('resetCFG');
		return o;
	};
	o.open=function(){
		if (!o.closed)return o;
		o.closed=false;
		o.resetCFG();
		o.resetData();
		
		o.buildUI();
		o.focus();
		if (!o.cloneCFG.requireAutosave)o.autoSave();
		o.callMeds('open');
		return o;
	};
	o.isHidden=function(){
		if (o.uiWindow && o.uiWindow.hasClass('ec_compose_hidecls'))return true;
		return false;
	};
	o.isMinimized=function(){
		if (o.uiWindow && o.uiWindow.hasClass('ec_compose_window_min'))return true;
		return false;
	};
	o.isMaximized=function(){
		if (o.uiWindow && o.uiWindow.hasClass('ec_compose_window_max'))return true;
		return false;
	};
	o.maximize=function(){
		var uiwin=o.uiWindow;
		uiwin.removeClass('ec_compose_window_min');
		if (uiwin.hasClass('ec_compose_window_max') || uiwin.hasClass('ec_compose_window_max2')){
			uiwin.removeClass('ec_compose_window_max');
			uiwin.removeClass('ec_compose_window_max2');
			o.components.fader.trigger('ec_compose_fader_remove');
		}
		else {
			uiwin.addClass('ec_compose_window_max');
			o.components.fader.trigger('ec_compose_fader_show');
		}
		$(window).trigger('ec_compose_render', o);
		o.resize();
		setTimeout(function(){
			o.resize();
		},0);
		return o;
	};
	o.minimize=function(){
		var uiwin=o.uiWindow;
		if (uiwin.hasClass('ec_compose_window_max')){
			uiwin.removeClass('ec_compose_window_max');
			o.components.fader.trigger('ec_compose_fader_remove');
			uiwin.addClass('ec_compose_window_max2');
		}
		
		if (uiwin.hasClass('ec_compose_window_min')){
			uiwin.removeClass('ec_compose_window_min');
			if (uiwin.hasClass('ec_compose_window_max2')){
				uiwin.removeClass('ec_compose_window_max2');
				uiwin.addClass('ec_compose_window_max');
				o.components.fader.trigger('ec_compose_fader_show');
			}
		}
		else {
			uiwin.addClass('ec_compose_window_min');
		}
		$(window).trigger('ec_compose_render', o);
		o.resize();
		setTimeout(function(){
			o.resize();
		},0);
		return o;
	};
	o.resize=function(){
		if (!o.closed){
			try{
			var tt=$('.ec_compose_htmleditor',o.uiWindow).position().top;
			var at=$(o.uiWindow).height()-40;
			o.components.editor.editor.theme.resizeTo($('.ec_compose_htmleditor',o.uiWindow).width(),at-tt-$('.ec_compose_htmleditor .mce-toolbar',o.uiWindow).height()-8);
			} catch(e){
				
			}
			var recfw=o.uiWindow.width()*0.86;
			var frsize=(recfw-$('.ec_compose_fromField .ec_compose_pkeycheckboxarea',o.uiWindow).width()-10);
			$('.ec_compose_fromField .ec_compose_selectarea',o.uiWindow).width(Math.round(frsize));
			$('.ec_compose_inputarea',o.uiWindow).width(recfw-8);
			o.callMeds('resize');
		}
		return o;
	};
	o.show=function(){
		if (o.uiWindow) o.uiWindow.removeClass('ec_compose_hidecls');
		if (o.components.fader) o.components.fader.removeClass('ec_compose_hidecls');
		$(window).trigger('ec_compose_render', o);
		o.callMeds('show');
		return o;
	};
	o.hide=function(){
		if (o.uiWindow) o.uiWindow.addClass('ec_compose_hidecls');
		if (o.components.fader) o.components.fader.addClass('ec_compose_hidecls');
		$(window).trigger('ec_compose_render', o);
		o.callMeds('hide');
		return o;
	};
	o.close=function(){
		if (o.closed)return o;
		o.closed=true;
		o.blur();
		o.destroyUI();
		o.resetData();
		o.stopAutoSave();
		o.callMeds('close');
		return o;
	};
	o.getRec=function(valid){
		var rec=generateEncryptUsers(valid, o.data.from, '#toCompose'+o.uid, '#ccCompose'+o.uid, '#bccCompose'+o.uid);
		return rec;
	};
	o.getGlobalComponents=function(d){
		var c={to:d.to,cc:d.cc,bcc:d.bcc,from:d.from,attachments:d.attachments};
		c.subjO=$('.ec_compose_subjectField .ec_compose_inputarea',o.uiWindow);
		c.encO=$('.ec_compose_checkbox',o.components.enc);
		c.textO=$('.ec_compose_htmleditor .ec_compose_textarea',o.uiWindow);
		c.checkEncStatus=o.checkEncStatus;
		c.getHtmlEditor=function(){
			return o.components.editor.editor;
		};
		c.isHtmlEditor=function(){
			return true;
		};
		c.hasContent=function(){
			return testHtmlEditorContent(d.text);
		};
		c.generateEncryptUsers=function(v){
			return generateEncryptUsers(v, d.from, '#toCompose'+o.uid, '#ccCompose'+o.uid, '#bccCompose'+o.uid);
		};
		c.unlockSubmitForm=function(){
			$('.watermark',o.uiWindow).remove();
			o.uiWindow.removeClass('ec_compose_lock');
		};
		c.lockSubmitForm=function(){
			o.compressRecipientsUI();
			o.uiWindow.addClass('ec_compose_lock');
			o.uiWindow.append($('<div class="watermark"></div>'));
		};
		c.set_draft_id=function(id){
			o.setDraftUid(id);
		};
		c.compose_field_hash=function(v){
			
		};
		c.auto_save_start=function(){
			o.autoSave();
		};
		c.setBoundary=function(v){
			d.boundary=v;
			c.form._ec_boundary.value=v;
		};
		c.setType=function(v){
			d.type=v;
			c.form._ec_type.value=v;
		};
		c.formUpdate=function(id,options){
			if (id=='beforeSubmit'){
				c.form._ec_enc.value=options.needsEnc ? '1' : '0';
				c.form._id.value=getComposeId(null,null,true);
				c.form._token.value=rcmail.env.request_token;
			} else if (id=='serialize'){
				
			}
		};
		c.suid=function(){
			return '';
		};
		c.form=$('.ec_compose_form',o.uiWindow)[0];
		c.ignorestrict=true;
		c._l1=1;
		c._f1=1;
		c._data=d;
		
		return c;
	};
	o.sendGlobal=function(draft, handler, returnHandler, initHandler){
		var d=o.data;
		var c=o.getGlobalComponents(d);
		encryptAndSend(draft, o.cloneCFG, c, function(){
			if (!rcmail.env.action && rcmail.env.mailbox==rcmail.env.drafts_mailbox){
				rcmail.command('list');
			}
			if (handler)handler();
		}, returnHandler, initHandler);
		return o;
	};
	o.ajax=function(d, composeid){
		var formaction='./?_task=mail';
		var ed=new ECEmailFormData(composeid, d.subject, d.to, d.text, d.enc, d.mbox);
		ed.data._cc=d.cc;
		ed.data._bcc=d.bcc;
		ed.data._from=d.from;
		ed.data._ignorestrict=1;
		
		var formdata=ed.serialize();
		var x=$.ajax({
			type: "POST",	url: formaction,	data:formdata,
			success: function(data){
				if (handler)handler(composeid,data);
			}
		});
		return x;
	};
	o.deleteForm=function(handler){
		var d=o.data;
		var draft=d.draft_uid;
		if (draft){
			var p={_target_mbox:o.rcmail.env.trash_mailbox, _mbox:o.rcmail.env.drafts_mailbox,_uid:draft,_remote:1};
			var ps=serializeURLParams(p);
			var x=$.ajax({
				type: "POST",	url: './?_task=mail&_action=move',	data:ps,
				success: function(data){
					if (!rcmail.env.action && rcmail.env.mailbox==rcmail.env.drafts_mailbox){
						rcmail.command('list');
					}
					if (handler)handler(data);
				}
			});
		}
		return o;
	};
	o.autoSaveIntervalId=null;
	o.autoSave=function(){
		if (!o.closed){
			if (o.cloneCFG.enableAutosave){
				o.stopAutoSave();
				o.autoSaveIntervalId=setInterval(function(){
					o.save();
				},o.cloneCFG.intervalAutosave*1000);
			}
			o.callMeds('autoSave');
		}
		return o;
	};
	o.stopAutoSave=function(){
		window.clearInterval(o.autoSaveIntervalId);
		o.autoSaveIntervalId=null;
		o.callMeds('stopAutoSave');
		return o;
	};
	o.save=function(handler, returnHandler, initHandler){
		o.stopAutoSave();
		if (o.cfg.enforceGlobalMailService){
			return o.sendGlobal(true, handler, returnHandler, initHandler);
		}
		return o;
	};
	o.readSourceBody=function(){
		readSourceBody(o.cloneCFG,{env:{mailbox:''}});
		o.callMeds('readSourceBody');
		return o;
	};
	o.onload=function(){
		o.callMeds('onload');
		return o;
	};
	o.loadsource=function(data){
		o.cloneCFG.source=data;
		o.readSourceBody();
		o.onload();
		return o;
	};
	o.load=function(){
		var d={_uid:o.data.uid,_mbox:o.data.mbox,_task:'mail',_action:'viewsource'};
		var source=ecc.getEmailCache(d._uid+'');
		var decoded_source = "";
		if (source){
			setTimeout(function(){

				try {
					decoded_source=atob(source);
				} catch(e){
					decoded_source=source;
				}
				while(true){
					try {
						var news=atob(decoded_source);
						decoded_source=news;
					} catch(e){
						break;
					}
				}

				o.loadsource(decoded_source);
			},0);
		} else {
			var x=$.ajax({
				type: "GET",
				url:'./?'+serializeURLParams(d),
				data:'',
				success: function(data){
					o.loadsource(data);
				}
			});
		}
		
		return o;
	};
	o.send=function(handler, returnHandler, initHandler){
		o.stopAutoSave();
		if (o.cfg.enforceGlobalMailService){
			return o.sendGlobal(false, handler, returnHandler, initHandler);
		} else {
			var d=o.data;
			var rec=o.getRec();
			var formaction='./?_task=mail';
			
			function onencrypted(){
				getComposeId(function(composeid){
					o.ajax(d, composeid);
				}, formaction, true);
			}
			
			if (d.enc){
				encryptContent(wrapMimeBody(d.text, d.text, null, null).body,function(result){
					d.text=result;
					onencrypted();
				},false,rec,d.from,true);
			} else {
				onencrypted();
			}
		}
		
		return o;
	};
	o.init=function(){
		o.inited=true;
		o.constructor();
		o.initTemplates();
		o.callMeds('init');
		return o;
	};
	o.buildUI=function(){
		o.components={};
		o.compressed=false;
		
		var uiwin=o.getHtmlTemplate('window', {}, function(t, d){
			t.addClass('ec_compose_window_uid_'+o.uid);
			$('body').append(t);
			t.attr('id',o.uid);
		});
		o.uiWindow=uiwin;
		
		var header=o.getHtmlTemplate('header', {t:rcmail.get_label('ec_plugin.ccompose_htitle')}, function(t,d){
			t.click(function(){
				o.focus();
			});
			$('.ec_compose_headertitle',t).html(d.t);
			$('.ec_compose_headermin',t).click(function(){
				o.minimize();
			});
			$('.ec_compose_headermax',t).click(function(){
				o.maximize();
			});
			new FloatingTooltip($('.ec_compose_headerclose',t), ecobj.get_label('ec_plugin.ccompose_closebtn'),true,true,'ccomposeclosett','top');
			$('.ec_compose_headerclose',t).click(function(){
				o.updateDataFromUI();
				if (o.dataIsEmpty()){
					o.close();
				} else {
					o.save(function(){
						o.close();
					},function(id){
						o.show();
					},function(){
						o.hide();
					});
				}
			});
			
			uiwin.append(t);
			
			uiwin.bind('ec_compose_destroy_ui', function(e){
				$('.ec_compose_headerclose',t).trigger('FloatingTooltip_destroy');
			});
		});
		var form=o.getHtmlTemplate('form',{},function(t,d){
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_id'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_reply_uid').addClass('ec_compose_replyid'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_forward_uid').addClass('ec_compose_forwardid'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_draft'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_mbox'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_ishtml').attr('value','1'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_token'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_boundary'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_is_html').attr('value','0'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_type'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_action').attr('value','send'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_task').attr('value','mail'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ignorestrict').attr('value','1'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_ec_enc'); }));
			t.append(o.getHtmlTemplate('hiddenInput', {}, function(tt,dd){ tt.attr('name','_draft_saveid').addClass('ec_compose_draftid'); }));
			
			t.attr('action','./?_task=mail');
			
			uiwin.append(t);
		});
		o.getHtmlTemplate('hseparator', {}, function(t,d){
			uiwin.append(t);
		});
		var c1=o.getHtmlTemplate('container',{},function(t,d){
			t.addClass('ec_compose_bottom_controls');
			uiwin.append(t);
		});
		o.getHtmlTemplate('checkboxArea', {t:ecobj.get_label('ec_plugin.comopt_encrypt'), v:o.cloneCFG.autoEncrypt ? true : false}, function(tt,dd){
			o.components.enc=tt;
			tt.addClass('ec_compose_enccheckboxarea');
			tt.append('<div class="icon"></div>');
			$('.ec_compose_checkbox',tt).attr('value','1').attr('id','ec_compose_enc_'+o.uid).attr('name','_ec_enc');
			$('.ec_compose_checkbox',tt).get(0).checked=dd.v;
			c1.append(tt);
			configureEncryptCheckbox($('.ec_compose_checkbox',tt), o.checkEncStatus, needsEncryption, o.cloneCFG);
		});
		o.getHtmlTemplate('buttonArea', {}, function(t,d){
			t.addClass('ec_compose_delete');
			$('.ec_compose_button',t).click(function(){
				o.deleteForm();
				o.close();
			});
			new FloatingTooltip(t, ecobj.get_label('ec_plugin.ccompose_trashbtn'),true,true,'ccomposedeltt','top');
			
			c1.append(t);
			
			uiwin.bind('ec_compose_destroy_ui', function(e){
				t.trigger('FloatingTooltip_destroy');
			});
		});
		
		var recC=o.getHtmlTemplate('labelArea',{t:rcmail.get_label('ec_plugin.ccompose_recipients')},function(t,d){
			o.components.recC=t;
			$('.ec_compose_label', t).text(d.t);
			t.addClass('ec_compose_recipients_summary');
			t.bind('focus',function(){
				o.expandRecipientsUI();
			})
			t.attr('tabindex','0');
			t.click(function(){
				t.trigger('focus');
			});
			form.append(t);
		});
		o.getHtmlTemplate('container',{},function(t,d){
			t.addClass('active_recipients');
			o.components.activeRec=t;
			form.append(t);
		});
		o.getHtmlTemplate('recField', {t:rcmail.get_label('ec_plugin.ccompose_to')}, function(t,d){
			$('.ec_compose_label',t).html(d.t);
			t.addClass('ec_compose_to');
			$('.ec_compose_textarea',t).attr('name','_to').attr('id',o.uid+'_to');
			var select = '<select id="to_emails" multiple="multiple"  class="toSelector" style="width: 100%" >'+
			'</select>';
			select=$(select);
			$('.ec_compose_textarea',t).hide();
			$('.ec_compose_textarea',t).parent().append(select);
			var filter=null;
			if (o.cfg.autoRemoveSelfFromRecipients && rcmail.env.ec_identities[0].email)filter=[rcmail.env.ec_identities[0].email];
			createToSelector(extractEmails(o.data.to, undefined, filter), 'to', select, 'toCompose'+o.uid, o.checkEncStatus, '#'+o.uid+'_to', o.cloneCFG, {skipTabKey:true});
			o.components.activeRec.append(t);
			$('#toCompose'+o.uid,uiwin).bind('select2_updateColors', function(e){
				if (o.compressed){
					o.updateDataFromUI();
					o.updateCompressedRecipientsUI();
				} else {
					t.css({'min-height':($('.ec_compose_text',t).height()-1)+'px'});
					o.resize();
				}
			}).bind('select2_adjust',function(e){
				var tmh=($('.ec_compose_text',t).height()-1)+'px';
				if (!o.compressed && t.css('min-height')!=tmh){
					t.css({'min-height':tmh});
					o.resize();
				}
			});
			o.getHtmlTemplate('buttonArea',{t:rcmail.get_label('ec_plugin.ccompose_bcc')},function(tt,d){
				tt.addClass('ec_compose_to_expandBCC');
				$('.ec_compose_button',tt).text(d.t).click(function(){
					o.expandRecipientsUI();
					$('.ec_compose_bcc',o.uiWindow).removeClass('ec_compose_compresshide');
					tt.hide();
					o.cloneCFG.bccSelector.trigger('focus');
					o.resize();
				});
				form.append(tt);
			});
			o.getHtmlTemplate('buttonArea',{t:rcmail.get_label('ec_plugin.ccompose_cc')},function(tt,d){
				tt.addClass('ec_compose_to_expandCC');
				$('.ec_compose_button',tt).text(d.t).click(function(){
					o.expandRecipientsUI();
					$('.ec_compose_cc',o.uiWindow).removeClass('ec_compose_compresshide');
					tt.hide();
					o.cloneCFG.ccSelector.trigger('focus');
					o.resize();
				});
				form.append(tt);
			});
			uiwin.bind('ec_compose_destroy_ui', function(e){
				select.trigger('toSelector_destroy');
			});
		});
		o.getHtmlTemplate('recField', {t:rcmail.get_label('ec_plugin.ccompose_cc')}, function(t,d){
			$('.ec_compose_label',t).html(d.t);
			t.addClass('ec_compose_cc');
			$('.ec_compose_textarea',t).attr('name','_cc').attr('id',o.uid+'_cc');
			var select = '<select id="cc_emails" multiple="multiple"  class="ccSelector" style="width: 100%" >'+
			'</select>';
			select=$(select);
			$('.ec_compose_textarea',t).hide();
			$('.ec_compose_textarea',t).parent().append(select);
			var filter=null;
			if (o.cfg.autoRemoveSelfFromRecipients && rcmail.env.ec_identities[0].email)filter=[rcmail.env.ec_identities[0].email];
			createToSelector(extractEmails(o.data.cc, undefined, filter), 'cc', select, 'ccCompose'+o.uid, o.checkEncStatus, '#'+o.uid+'_cc', o.cloneCFG, {skipTabKey:true});
			o.components.activeRec.append(t);
			$('#ccCompose'+o.uid,uiwin).bind('select2_updateColors', function(e){
				if (o.compressed){
					o.updateDataFromUI();
					o.updateCompressedRecipientsUI();
				} else {
					t.css({'min-height':($('.ec_compose_text',t).height()-1)+'px'});
					o.resize();
				}
			}).bind('select2_adjust',function(e){
				var tmh=($('.ec_compose_text',t).height()-1)+'px';
				if (!o.compressed && t.css('min-height')!=tmh){
					t.css({'min-height':tmh});
					o.resize();
				}
			});
			uiwin.bind('ec_compose_destroy_ui', function(e){
				select.trigger('toSelector_destroy');
			});
		});
		o.getHtmlTemplate('recField', {t:rcmail.get_label('ec_plugin.ccompose_bcc')}, function(t,d){
			$('.ec_compose_label',t).html(d.t);
			t.addClass('ec_compose_bcc');
			$('.ec_compose_textarea',t).attr('name','_bcc').attr('id',o.uid+'_bcc');
			var select = '<select id="bcc_emails" multiple="multiple"  class="bccSelector" style="width: 100%" >'+
			'</select>';
			select=$(select);
			$('.ec_compose_textarea',t).hide();
			$('.ec_compose_textarea',t).parent().append(select);
			var filter=null;
			if (o.cfg.autoRemoveSelfFromRecipients && rcmail.env.ec_identities[0].email)filter=[rcmail.env.ec_identities[0].email];
			createToSelector(extractEmails(o.data.bcc, undefined, filter), 'bcc', select, 'bccCompose'+o.uid, o.checkEncStatus, '#'+o.uid+'_bcc', o.cloneCFG, {skipTabKey:true});
			o.components.activeRec.append(t);
			$('#bccCompose'+o.uid,uiwin).bind('select2_updateColors', function(e){
				if (o.compressed){
					o.updateDataFromUI();
					o.updateCompressedRecipientsUI();
				} else {
					t.css({'min-height':($('.ec_compose_text',t).height()-1)+'px'});
					o.resize();
				}
			}).bind('select2_adjust',function(e){
				var tmh=($('.ec_compose_text',t).height()-1)+'px';
				if (!o.compressed && t.css('min-height')!=tmh){
					t.css({'min-height':tmh});
					o.resize();
				}
			});
			uiwin.bind('ec_compose_destroy_ui', function(e){
				select.trigger('toSelector_destroy');
			});
		});
		o.getHtmlTemplate('fromField', {t:rcmail.get_label('ec_plugin.ccompose_from')}, function(t,d){
			$('.ec_compose_label',t).html(d.t);
			form.append(t);
			$('.ec_compose_select',t).attr('name','_from');
			for(var i=0;i<rcmail.env.ec_identities.length;i++){
				o.getHtmlTemplate('option',rcmail.env.ec_identities[i], function(tt,d){
					tt.text(d.ident);
					tt.attr('value',d.ident);
					$('.ec_compose_select',t).append(tt);
				});
			}
			$('.ec_compose_select',t).bind('focus',function(){
				//o.compressRecipientsUI();
			});
			if (o.cloneCFG.enablePublicKeyAttachment){
				o.getHtmlTemplate('checkboxArea', {t:ecobj.get_label('ec_plugin.addpkey')}, function(tt,dd){
					o.components.pkey=tt;
					tt.addClass('ec_compose_pkeycheckboxarea');
					$('.ec_compose_checkbox_label',tt).append(dd.t);
					$('.ec_compose_checkbox',tt).attr('id','ec_compose_pkey_'+o.uid);
					t.append(tt);
					
					uiwin.bind('ec_compose_init_ui', function(){
						configurePKeyAttachment($('.ec_compose_checkbox',tt), function(){
							return $('.ec_compose_fromField .ec_compose_select',o.uiWindow).val();
						}, o.cloneCFG, $('.ec_compose_attachments .ec_compose_list', o.uiWindow));
					});
				});
			}
		});
		o.getHtmlTemplate('subjectField', {t:rcmail.get_label('ec_plugin.ccompose_subject')+':'}, function(t,d){
			$('.ec_compose_label',t).html(d.t);
			$('.ec_compose_inputarea',t).attr('name','_subject').bind('focus',function(){
				o.compressRecipientsUI();
			});
			form.append(t);
		});
		o.getHtmlTemplate('listArea', {}, function(t,d){
			t.addClass('ec_compose_attachments');
			form.append(t);
			t.bind('ec_rearrangeAttachmentLi', function(e){
				t.height($('.ec_compose_list',t).height());
				o.resize();
			});
			t.height(0);
			t[0].addEventListener('dragover',function(e){
				e.preventDefault();
		        e.stopPropagation();
				t.addClass('ec_compose_dragover');
			});
			t[0].addEventListener('dragleave',function(e){
				e.preventDefault();
		        e.stopPropagation();
				t.removeClass('ec_compose_dragover');
			});
			t[0].addEventListener('drop',function(e){
				e.preventDefault();
		        e.stopPropagation();
				t.removeClass('ec_compose_dragover');
		        
				if(!o.uiWindow.hasClass('ec_compose_lock') && e.dataTransfer) {
					var files = e.dataTransfer.files; 
					if (files)o.uploadFiles(files);
				}
				return;
			},false);
		});
		o.getHtmlTemplate('textArea', {}, function(t,d){
			t.addClass('ec_compose_htmleditor');
			var tedid='ec_compose_rte_'+o.uid;
			$('.ec_compose_textarea', t).attr('id', tedid).attr('name', '_message');
			form.append(t);
			var ted=null;
			
			var dragarea=$('<div class="ec_compose_dragover2"></div>');
			o.uiWindow[0].addEventListener('dragover',function(e){
				e.preventDefault();
		        e.stopPropagation();
				$('.mce-tinymce',t).append(dragarea);
			});
			o.uiWindow[0].addEventListener('dragleave',function(e){
				e.preventDefault();
		        e.stopPropagation();
		        if (dragarea.parent().length>0)dragarea.remove();
			});
			o.uiWindow[0].addEventListener('drop',function(e){
				e.preventDefault();
		        e.stopPropagation();
		        if (dragarea.parent().length>0)dragarea.remove();
		        
				if(!o.uiWindow.hasClass('ec_compose_lock') && e.dataTransfer) {
					var files = e.dataTransfer.files; 
					if (files)o.uploadFiles(files);
				}
				return;
			},false);
			
			setTimeout(function(){
				var cfg={selector:'#'+tedid, lang:rcmail.env.editor_config.lang};
				cfg.editorSettings={};
				cfg.editorSettings.toolbar='fontselect fontsizeselect | bold italic underline forecolor backcolor | image link unlink table | '
					+' alignleft aligncenter alignright alignjustify numlist bullist | outdent indent blockquote ltr rtl'
					+ (o.cloneCFG.htmlEditor_undo ? ' | undo redo' : '');
				cfg.editorSettings.height=230;
				cfg.editorSettings.setup=function(editor) {
					ted.editor=editor;
					editor.on('focus', function(e) {
					    o.compressRecipientsUI();
					});
					o.resize();
					
					function checkBody(){
						var b=ted.getBody();
						if (!b){
							setTimeout(function(){
								checkBody();
							},100);
						} else {
							b.addEventListener('dragover',function(e){
								if(!o.uiWindow.hasClass('ec_compose_lock') && e.dataTransfer) {
									var files = e.dataTransfer.files; 
									$('.mce-tinymce',t).append(dragarea);
								}
								return true;
							});
							b.addEventListener('dragleave',function(e){
								if (dragarea.parent().length>0)dragarea.remove();
								return true;
							});
							b.addEventListener('drop',function(e){
								if (dragarea.parent().length>0)dragarea.remove();
								if(!o.uiWindow.hasClass('ec_compose_lock') && e.dataTransfer) {
									var files = e.dataTransfer.files; 
									if (files){
										var imgsonly=true;
										for(var i=0;i<files.length;i++){
											var ftype=files[i].type;
											if ((ftype && ftype.toLowerCase().split('/')[0]!='image') || ftype == "") {
												imgsonly=false;
												break;
											}
										}
										if (!imgsonly){
											o.uploadFiles(files);
											e.preventDefault();
									        e.stopPropagation();
											return;
										}
										else {
											
										}
									}
								} else {
									e.preventDefault();
							        e.stopPropagation();
								}
							},false);
						}
						o.resize();
					}
					
					checkBody();
				};
				ted=new EC_TextEditor(cfg, rcmail, {});
				o.components.editor=ted;
				ted.init();
			},0);
			uiwin.bind('ec_compose_destroy_ui', function(e){
				ted.destroy();
				delete o.components.editor;
			});
			uiwin.bind('ec_compose_focus', function(){
				try {
					ted.editor.focus();
				} catch(e) {	}
			});
		});
		
		o.getHtmlTemplate('buttonArea', {t:rcmail.get_label('ec_plugin.ccompose_sendbtn')}, function(t,d){
			$('.ec_compose_button',t).html(d.t);
			t.addClass('ec_compose_send');
			$('.ec_compose_button',t).click(function(e){
				o.updateDataFromUI();
				var verdict=o.verify();
				if (verdict!=true) o.executeVerifyResult(verdict);
				else {
					o.send(function(){
						if (!o.cfg.enforceGlobalMailService) rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.ajax_sent'),[],null);
						o.close();
					},function(id){
						o.show();
					},function(){
						o.hide();
					});
				}
			});
			uiwin.append(t);
		});
		o.getHtmlTemplate('buttonArea', {t:rcmail.get_label('ec_plugin.ccompose_savebtn')}, function(t,d){
			$('.ec_compose_button',t).html(d.t);
			t.addClass('ec_compose_save');
			$('.ec_compose_button',t).click(function(){
				o.updateDataFromUI();
				o.save(function(){
					
				},function(id){
					
				},function(){
					
				});
			});
			uiwin.append(t);
		});
		o.getHtmlTemplate('buttonArea', {t:rcmail.get_label('ec_plugin.ccompose_attachbtn')}, function(t,d){
			$('.ec_compose_button',t).html(d.t);
			t.addClass('ec_compose_attach');
			o.components.attachInp=$('<input multiple type="file">');
			o.components.attachInp.change(function(){
				var files=o.components.attachInp[0].files;
				o.uploadFiles(files);
				o.components.attachInp.val('');
			});
			$('.ec_compose_button',t).click(function(){
				o.components.attachInp.click();
			});
			uiwin.append(t);
		});
		o.getHtmlTemplate('fader', {}, function(t,d){
			o.components.fader=t;
			uiwin.parent().append(t);
			t.hide();
			t.bind('ec_compose_fader_remove', function(){
				t.hide();
			});
			t.bind('ec_compose_fader_show', function(){
				t.show();
			});
			uiwin.bind('ec_compose_destroy_ui', function(e){
				t.trigger('ec_compose_fader_remove');
				t.remove();
				delete o.components.fader;
			});
		});
		o.compressRecipientsUI();
		
		uiwin.trigger('ec_compose_init_ui');
		$(window).trigger('ec_compose_render', o);
		o.callMeds('buildUI');
		return o;
	};
	o.destroyUI=function(){
		o.uiWindow.trigger('ec_compose_destroy_ui');
		o.uiWindow.empty();
		o.uiWindow.remove();
		o.uiWindow=null;
		o.components={};
		o.compressed=false;
		$(window).trigger('ec_compose_render', o);
		o.callMeds('destroyUI');
		return o;
	};
	o.checkEncStatus=function(){
		var statusO=$('.ec_compose_option_font', o.components.enc);
		var addpkeyO=o.components.pkey;
		var label;
		var encO=$('.ec_compose_checkbox', o.components.enc);
		checkEncStatus(o.cloneCFG, statusO, addpkeyO, label, encO);
		return o;
	};
	o.updateDataFromUI=function(){
		o.data.subject=$('.ec_compose_subjectField .ec_compose_inputarea',o.uiWindow).val();
		o.data.to=$('.ec_compose_to .ec_compose_textarea',o.uiWindow).val();
		o.data.cc=$('.ec_compose_cc .ec_compose_textarea',o.uiWindow).val();
		o.data.bcc=$('.ec_compose_bcc .ec_compose_textarea',o.uiWindow).val();
		o.data.text='';
		if (o.components.editor && o.components.editor.editor){
			o.components.editor.editor.save();
			try{
				o.data.text=o.components.editor.editor.getContent({format:'html'});
			} catch(e){
				o.data.text='';
			}
		}
		o.data.enc=$('.ec_compose_checkbox',o.components.enc).get(0).checked ? true : false;
		o.data.from=$('.ec_compose_fromField .ec_compose_select',o.uiWindow).text();
		o.callMeds('updateDataFromUI');
		return o;
	};
	o.dataIsEmpty=function(){
		if (o.data.subject)return false;
		if (o.data.to)return false;
		if (o.data.cc)return false;
		if (o.data.bcc)return false;
		if (o.data.text)return false;
		
		return true;
	};
	o.alert=function(){
		
		return o;
	};
	o.verify=function(){
		var verdict={};
		
		for(var key in verdict){
			return verdict;
		}
		
		return true;
	};
	o.executeVerifyResult=function(d){
		
		return o;
	};
	o.compressed=false;
	o.updateCompressedRecipientsUI=function(){
		if (!o.data.to && !o.data.cc && !o.data.bcc){
			$('.ec_compose_label',o.components.recC).text(rcmail.get_label('ec_plugin.ccompose_recipients'));
		} else {
			var to=extractEmails(o.data.to,null,null,3);
			var cc=extractEmails(o.data.cc,null,null,3);
			var bcc=extractEmails(o.data.bcc,null,null,3);
			var all=to.concat(cc).concat(bcc);
			var unique=[];
			var umap=[];
			var valid=extractEmails(o.getRec(true).join(',').toLowerCase(),false);
			for(var i=0;i<all.length;i++){
				var elem=all[i];
				var e=elem[1].toLowerCase();
				if (umap.indexOf(e)==-1){
					unique.push('<span class="'+(valid.indexOf(e)<0 ? 'invalid-email' : 'valid-email')+'">'+html_encode(elem[0])+'</span>');
					umap.push(e);
				}
			}
			$('.ec_compose_label',o.components.recC).html(unique.join(' '));
		}
		o.callMeds('updateCompressedRecipientsUI');
		return o;
	};
	o.compressRecipientsUI=function(){
		if (o.compressed)return o;
		o.compressed=true;
		$('.ec_compose_to',o.uiWindow).addClass('ec_compose_compresshide');
		$('.ec_compose_cc',o.uiWindow).addClass('ec_compose_compresshide');
		$('.ec_compose_bcc',o.uiWindow).addClass('ec_compose_compresshide');
		$('.ec_compose_fromField',o.uiWindow).addClass('ec_compose_compresshide');
		$('.ec_compose_recipients_summary',o.uiWindow).removeClass('ec_compose_compresshide');
		o.checkEncStatus();
		o.updateDataFromUI();
		if (!o.data.bcc){
			$('.ec_compose_to_expandBCC',o.uiWindow).show();
		}
		if (!o.data.cc){
			$('.ec_compose_to_expandCC',o.uiWindow).show();
		}
		o.updateCompressedRecipientsUI();
		
		$('#toCompose'+o.uid,o.uiWindow).blur();
		$('#ccCompose'+o.uid,o.uiWindow).blur();
		$('#bccCompose'+o.uid,o.uiWindow).blur();
		o.resize();
		return o;
	};
	o.expandRecipientsUI=function(){
		if (!o.compressed)return o;
		o.compressed=false;
		$('.ec_compose_to',o.uiWindow).removeClass('ec_compose_compresshide');
		$('.ec_compose_cc',o.uiWindow).removeClass('ec_compose_compresshide');
		$('.ec_compose_bcc',o.uiWindow).removeClass('ec_compose_compresshide');
		$('.ec_compose_fromField',o.uiWindow).removeClass('ec_compose_compresshide');
		$('.ec_compose_recipients_summary',o.uiWindow).addClass('ec_compose_compresshide');
		o.checkEncStatus();
		o.updateDataFromUI();
		if (!o.data.bcc){
			$('.ec_compose_bcc',o.uiWindow).addClass('ec_compose_compresshide');
			$('.ec_compose_to_expandBCC',o.uiWindow).show();
		}
		if (!o.data.cc){
			$('.ec_compose_cc',o.uiWindow).addClass('ec_compose_compresshide');
			$('.ec_compose_to_expandCC',o.uiWindow).show();
		}
		if (o.data.to)o.cloneCFG.toSelector.trigger('focus');
		else if (o.data.cc)o.cloneCFG.ccSelector.trigger('focus');
		else if (o.data.bcc)o.cloneCFG.bccSelector.trigger('focus');
		else o.cloneCFG.toSelector.trigger('focus');
		o.resize();
		return o;
	};
	o.setHeaderTitle=function(v){
		$('.ec_compose_headertitle', o.uiWindow).html(v);
		return o;
	};
	o.focus=function(){
		if (o.uiWindow)o.uiWindow.trigger('ec_compose_focus');
		o.callMeds('focus');
		return o;
	};
	o.blur=function(){
		if (o.uiWindow)o.uiWindow.trigger('ec_compose_blur');
		o.callMeds('blur');
		return o;
	};
	o.setSubject=function(v){
		o.data.subject=v;
		$('.ec_compose_subjectField .ec_compose_inputarea',o.uiWindow).val(v);
		return o;
	};
	o.setText=function(v){
		o.data.text=v;
		return o;
	};
	o.setAttachments=function(){
		
		return o;
	};
	o.setTo=function(v){
		o.data.to=v.join(',');
		for(var i=0;i<v.length;i++){
			$('#toCompose'+o.uid,o.uiWindow).trigger('add_value',v[i]);
		}
		return o;
	};
	o.setCC=function(v){
		if (!v)v=[];
		o.data.cc=v.join(',');
		for(var i=0;i<v.length;i++){
			$('#ccCompose'+o.uid,o.uiWindow).trigger('add_value',v[i]);
		}
		return o;
	};
	o.setBCC=function(v){
		if (!v)v=[];
		o.data.bcc=v.join(',');
		for(var i=0;i<v.length;i++){
			$('#bccCompose'+o.uid,o.uiWindow).trigger('add_value',v[i]);
		}
		return o;
	};
	o.setDraftUid=function(id){
		o.data.draft_uid=id;
		$('.ec_compose_draftid',o.uiWindow).val(id);
	};
	o.setReplyUid=function(id){
		o.data.reply_uid=id;
		$('.ec_compose_replyid',o.uiWindow).val(id);
	};
	o.setForwardUid=function(id){
		o.data.forward_uid=id;
		$('.ec_compose_forwardid',o.uiWindow).val(id);
	};
	o.uploadFiles=function(filelist){
		uploadFiles(filelist, o.cloneCFG, $('.ec_compose_attachments .ec_compose_list', o.uiWindow));
	};
	
	
	return o;
}

//EC_TextEditor(ECClientCFG cfg, rcmail rcmail, Object options) : Object
function EC_TextEditor(cfg, rcmail, options){
	var o=this;
	if (!options)options={};
	
	rcmail.env.editor_config
	
	var target=$(cfg.selector);
	
	o.editor=null;
	o.cfg = {
	  selector:cfg.selector,
      cache_suffix: 's=4031300',
      theme: 'modern',
      language: cfg.lang,
      content_css: rcmail.assets_path('program/js/tinymce/roundcube/content.css'),
      menubar: false,
      statusbar: false,
      toolbar_items_size: 'small',
      extended_valid_elements: 'font[face|size|color|style],span[id|class|align|style]',
      relative_urls: false,
      remove_script_host: false,
      convert_urls: false, 
      image_description: false,
      paste_webkit_style: "color font-size font-family",
      paste_data_images: true,
      image_advtab:true,
      browser_spellcheck: true
    };
	$.extend(o.cfg, {
      plugins: 'autolink charmap code colorpicker directionality link image media nonbreaking'
        + ' paste table tabfocus textcolor searchreplace spellchecker lists advlist',
      toolbar: 'bold italic underline | alignleft aligncenter alignright alignjustify'
        + ' | bullist numlist outdent indent ltr rtl blockquote | forecolor backcolor | fontselect fontsizeselect'
        + ' | link unlink table | $extra charmap image media | code searchreplace undo redo',
      spellchecker_language: rcmail.env.spell_lang,
      accessibility_focus: false,
      file_browser_callback: function(name, url, type, win) { o.file_browser_callback(name, url, type); },
      file_browser_callback_types: 'image media'
    });
	if (cfg.editorSettings) $.extend(o.cfg, cfg.editorSettings);
	
	if (options.settings)o.settings=options.settings;
	o.rcmail=rcmail;
	o.options=options;
	
	o.constructor=function(){
		
		return o;
	};
	o.getDoc=function(){
		var doc=null;
		try{
			doc=o.editor.dom.doc;
		}catch(e){
			return null;
		}
		
		return doc;
	};
	o.getBody=function(){
		var d=o.getDoc();
		if (d)
			return d.body;
		return null;
	};
	o.init=function(){
		o.constructor();
		tinymce.init(o.cfg);
		
		return o;
	};
	o.destroy=function(){
		tinymce.remove(o.cfg.selector);
		
		return o;
	};
	
	return o;
}

