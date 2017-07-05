/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

class ECClient {
    constructor(rcmail, ECClientCFG = null) {
    	this.rcmail=rcmail;
    	this.ECClientCFG = {
			
		};
    	if (ECClientCFG){
    		this.ECClientCFG=ECClientCFG;
    	}
    	this.pkd=null;
    	this.ecobj=null;
    }
	initEC() {
		this.ecobj=new ECClientObj(this.rcmail, this.ECClientCFG, null, null, null, this);
		
		return this;
	}
	setPassphrase(pass, encode) {
		if (encode) pass=btoa(randomStr(this.ECClientCFG.passwordPrefixLength)+encodeURIComponent(pass));
		setClassStorage("user_passphrase", pass, null, null, null, true);
		return this;
	}
	getPassphrase(decode) {
		var pass=getClassStorage("user_passphrase");
		if (decode && pass){
			try{
				pass=atob(pass).substr(this.ECClientCFG.passwordPrefixLength);
			}catch(e){
				removeClassStorage("user_passphrase");
				return '';
			}
		}
		return decodeURIComponent(pass);
	}
	setPassphraseExp(exp){
		setClassStorage("passphrase_exp", exp);
		return this;
	}
	getPassphraseExp(){
		var exp=parseFloat(localStorage.getItem("passphrase_exp"));
		if (!exp || isNaN(exp))exp=0;
		return exp;
	}
	setKeyHandler(keys, notime){
		setClassStorage('keys',keys ? JSON.stringify(keys) : '');
		var cfg=this.ECClientCFG;
		if (!notime)setClassStorage('keyCacheExp', getTime()+cfg.keyCacheExpiration);
		return this;
	}
	getKeyHandler(){
		var keys=localStorage.getItem('keys');
		if (keys){
			keys=JSON.parse(keys);
		}
		return keys || null;
	}
	verifyInterval(handler, time, verifyCall, value, elseHandler){
		var verifyid=setInterval(function(){
			var val2=verifyCall();
			if (val2>value){
				window.clearInterval(verifyid);
				if (handler) handler();
			} else {
				if (elseHandler) elseHandler(val2)
			}
		}, time);
		return verifyid;
	}
	verifyTimeout(handler, time, verifyCall, elseHandler, repeat){
		var ecc=this;
		var id=setTimeout(function(){
			var exp=verifyCall();
			var curtime=getTime();
			if (curtime>=exp){
				if (handler) handler();
			} else {
				if (elseHandler) elseHandler(exp, curtime);
				if (repeat) {
					repeat(ecc.verifyTimeout(handler, exp-curtime, verifyCall, elseHandler, repeat));
				}
			}
		},time);
		return id;
	}
	
	isEmailCached(uid, id){
		var uids=this.getCachedEmailUids(null, id);
		if (uids.indexOf(uid)>=0){
			return true;
		}
		return false;
	}
	getEmailCache(uid, id){
		var uids=this.getCachedEmailUids(null, id);
		if (uids.indexOf(uid)>=0){
			return localStorage.getItem((id || "emailCache")+'_'+uid);
		}
		return null;
	}
	setEmailCache(source, uid, override, id, limitv, sizev, purgev, unshift){
		if (!checkLogState())return false;
		var uids=this.getCachedEmailUids(null, id);
		var fuids=this.getCachedEmailUids('F', id);
		var index=uids.indexOf(uid);
		var indexf=fuids.indexOf(uid);
		var cfg=this.ECClientCFG;
		var purgeid;
		if (override && index>=0 && override!=2) uids.splice(index, 1);
		if (index<0 && uids.length>=cfg[limitv || "emailCacheLimit"]){
			if (cfg[purgev || "emailCachePurge"]){
				purgeid=uids.shift();
			} else {
				return false;
			}
		}
		var size=getStringByteSize(source);
		if (size>cfg[sizev || "emailCacheSizePerItem"]){
			if (indexf<0){
				fuids.push(uid);
				setClassStorage((id || "emailCache")+'F', JSON.stringify(fuids));
			}
			return false;
		}
		if (index<0 || override){
			localStorage.setItem((id || "emailCache")+'_'+uid, source);
			if (uids.indexOf(uid)<0){
				if (unshift)uids.unshift(uid);
				else uids.push(uid);
			}
			if (purgeid)localStorage.removeItem((id || "emailCache")+'_'+purgeid);
			setClassStorage(id || "emailCache", JSON.stringify(uids));
			if (indexf>=0){
				fuids.splice(uid, 1);
				setClassStorage((id || "emailCache")+'F', JSON.stringify(fuids));
			}
			return true;
		}
		return false;
	}
	delCachedEmail(uid, id){
		var uids=this.getCachedEmailUids(null, id);
		var fuids=this.getCachedEmailUids('F', id);
		var index=uids.indexOf(uid);
		var indexf=fuids.indexOf(uid);
		if (index>=0)uids.splice(index,1);
		if (indexf>=0)uids.splice(indexf,1);
		localStorage.removeItem((id || "emailCache")+'_'+uid);
		localStorage.setItem(id || 'emailCache', JSON.stringify(uids));
		localStorage.setItem((id || "emailCache")+'F', JSON.stringify(fuids));
	}
	getCachedEmailUids(suffix, id){
		var uids=localStorage.getItem((id || 'emailCache')+(suffix || ''));
		if (uids)uids=JSON.parse(uids);
		if (!uids) uids=[];
		return uids;
	}
	clearEmailCache(id){
		var uids=this.getCachedEmailUids(null, id);
		localStorage.removeItem((id || "emailCache")+'F');
		if (uids && uids.length>0){
			for(var i=0;i<uids.length;i++){
				localStorage.removeItem((id || "emailCache")+'_'+uids[i]);
			}
			localStorage.removeItem(id || 'emailCache');
			return true;
		}
		return false;
	}
	
	clearAllListCache(){
		for(var i=0;i<rcmail.env.mailboxes_list.length;i++){
			var mb=rcmail.env.mailboxes_list[i];
			this.clearEmailCache("listCache"+mb);
		}
	}
	hardCacheClean(lockkey){
		var store={};
		var key;
		for(var i=0;i<localStorage.length;i++){
			key=localStorage.key(i);
			if (key.indexOf(lockkey)==0)store[key]=true;
		}
		for(var key in store){
			localStorage.removeItem(key);
		}
	}
	purgeAllCacheAndLocks(){
		ClearLockStorage(null,true);
		this.hardCacheClean("listCache");
		this.hardCacheClean("emailCache");
		this.hardCacheClean("keyCache");
	}
	
	getEmail(uid, h, m){
		var x=$.ajax({
			type: "POST",
			url:m=='source' ? this.rcmail.url('viewsource',this.rcmail._params_from_uid(uid)) : this.rcmail.url('preview',this.rcmail._params_from_uid(uid,{_ec_cache:1})),
			data:'',
			success: function(data){
				if (h) h(data, uid);
			}
		});
		return function(){
			x.abort();
		};
	}
	fetchEmail(uid, h, m){
		var ecc=this;
		this.stopEmailFetch();
		this.fetching=true;
		this.fetch_object={uid:uid,handler:h,method:m};
		this.fetch_timeoutid=setTimeout(function(){
			ecc.fetch_stop_method=ecc.getEmail(uid,h,m);
		}, this.ECClientCFG.fetchTimeout);
	}
	getFetchQueue(handler, noncached, limit, sizev){
		var ecc=this;
		var ids=[];
		var msgs=this.rcmail.env.messages;
		var uids=this.getCachedEmailUids();
		var fuids=this.getCachedEmailUids('F');
		var sorted_msgs=getSortedMessages();
		var cfg=this.ECClientCFG;
		for(var key in sorted_msgs){
			var id=sorted_msgs[key];
			if ((msgs[id].ec_encrypted || cfg.emailUnencryptCache) && (noncached || uids.indexOf(id)<0) && fuids.indexOf(id)<0 && msgs[id].ec_size<=cfg[sizev || "emailCacheSizePerItem"]){
				ids.push(id);
				if (limit>0 && ids.length==limit)break;
			}
		}
		handler(ids);
		return this;
	}
	onEmailFetch(handler, method){
		var ecc=this;
		this.stopEmailFetch();
		var cfg=this.ECClientCFG;
		var limit=cfg.autoFetchLimit>0 ? cfg.autoFetchLimit : cfg.emailCacheLimit;
		var cuids=this.getCachedEmailUids();
		if (cfg.autoFetchUpdate){
			this.getFetchQueue(function(queue){
				if (queue.length>0){
					var cacheid;
					for(var i=0;i<queue.length;i++){
						if (cuids.indexOf(queue[i])<0){
							cacheid=queue[i];
							break;
						}
					}
					if (cuids.length>=limit){
						for(i=0;i<cuids.length;i++){
							if (queue.indexOf(cuids[i])<0){
								ecc.delCachedEmail(cuids[i]);
								break;
							}
						}
					}
					if (cacheid)ecc.fetchEmail(cacheid, handler, method)
				}
			}, true, limit);
		} else {
			if (cuids.length>=limit) return;
			this.getFetchQueue(function(queue){
				if (queue.length>0)ecc.fetchEmail(queue[0], handler, method)
			});
		}
		return this;
	}
	stopEmailFetch(){
		if (this.fetching){
			this.fetching=false;
			this.fetch_object=null;
			if (this.fetch_stop_method)this.fetch_stop_method();
			this.fetch_stop_method=null;
			window.clearTimeout(this.fetch_timeoutid);
			return true;
		}
		return false;
	}
	
	onLogout(handler, dologout=false){
		var cfg=this.ECClientCFG;
		cfg.loggingOut=true;
		var rcm=this.rcmail;
		
		var logout_handler = function() {
			if (cfg.clearPassOnLogout){
				removeClassStorage("user_passphrase");
				localStorage.removeItem("passphrase_exp");
			}
			if (cfg.clearKeysOnLogout){
				localStorage.removeItem("keys");
			}
			if (cfg.clearSessionsOnLogout){
				localStorage.removeItem("ec_session");
				localStorage.removeItem("ec_session_count");
			}
			if (handler)handler();
			if (dologout || !handler){
				rcm.command('switch-task','logout');
			}
		};
		
		if (cfg.lockOnLogout){
			if (dologout) {
				this.lockSession(logout_handler);
			} else {
				this.lockScreen(logout_handler);
			}
		} else {
			logout_handler();
		}
	}
	lockSession(handler, successhandler){
		this.ECClientCFG.lockMode=true;
		this.ECClientCFG.enableHTTPFilter=true;
		this.stopEmailFetch();
		stopQueue();
		if (this.ECClientCFG.lockSessionStorage) LockStorage(null, handler, handler);
		else {
			LockStorage(1, handler);
		}
		setPassphrase(successhandler);
		return true;
	}
	lockScreen(handler, successhandler){
		if (this.ECClientCFG.lockMode)return false;
		return this.lockSession(handler, successhandler);
	}
	unlockScreen(){
		if (!this.ECClientCFG.lockMode)return false;
		this.ECClientCFG.lockMode=false;
		this.ECClientCFG.enableHTTPFilter=false;
		if (this.ECClientCFG.lockSessionStorage) UnlockStorage();
		else UnlockTempStorage();
		return true;
	}
	isLocked(){
		return this.ECClientCFG.lockMode;
	}
	
	isForbiddenFolder(folder){
		var dfg=this.ECClientCFG.disableFolderDrag;
		if (folder==rcmail.env.drafts_mailbox || folder==rcmail.env.sent_mailbox)return true;
		for(var i=0;i<dfg.length;i++){
    		var dt=dfg[i];
    		if (folder==dt || (dt.charAt(0)=='*' && folder.indexOf(dt.substr(1))>=0 && !folder.split(dt.substr(1))[1])){
    			return true;
    		}
    	}
		return false;
	}
}

function ECClientObj(rcmail, ECClientCFG, domain, options, events, ecc){
	var obj={};
	if (!options)options={};
	if (!events)events=ECClientCFG.events || {};
	
	if (ECClientCFG.fitListCacheLimitToPageSize) ECClientCFG.listCacheLimit=rcmail.env.pagesize;
	
	obj.clearAllNotifcations = function(filter, invert){
		var msgs=[];
		var i=0;
		for(var key in rcmail.messages){
			var o=rcmail.messages[key];
			if ((invert && filter && filter[key]) || (!invert && (!filter || !filter[key]))){
				if (o.labels){
					for (i=0;i<o.labels.length;i++){
						if (o.labels[i]) msgs.push(o.labels[i]);
					}
				} else if (o.elements){
					for (i=0;i<o.elements.length;i++){
						if (o.elements[i]) msgs.push({id:o.elements[i]});
					}
				}
			}
		}
		for(i=0;i<msgs.length;i++){
			if (msgs[i]) rcmail.hide_message(msgs[i].id);
		}
		return msgs;
	};
	obj.get_label = function (id, group){
		return rcmail.get_label(id, group);
	};
	
	rcmail.addEventListener(events['init'] || 'init', function (evt) {
		if (ECClientCFG.debugExt)log('eventInit',evt);
		checkRCUserId();
		
		if (checkLogState()){
			createECSession(rcmail.env.task+'-'+rcmail.env.action, function(){ 
				if (!checkLogState())return true;
				return ecc.isLocked(); 
			});
		}
		if (evt.task == 'mail'){
			if (ECClientCFG.debugExt)log(rcmail.env.ec_error,rcmail.env.uid);
			if (!rcmail.env.uid && rcmail.env.action=='preview'){
				executeerrorlogic();
				return;
			}
			
			if (evt.action!=''){
				initComposeOptions();
				initContent();
			}
			initPKD();
			verifyLocks();
			if (ECClientCFG.startUpCheckEncDec){
				checkEncDec(function(valid){
					if (!valid) {
						ecc.lockScreen();
					}
				});
			}
			initMail();
			
			switch (evt.action) {
				case 'compose':
					updateTo();
					break
				case 'show':
					decryptEmailMixed('html');
					break
				case 'preview':
					decryptEmailMixed('html');
					break;
				case 'list':
				case '':
					configMessageList();
					break;
			}
		}
	});
	rcmail.addEventListener(events['beforesend'] || 'beforesend', function (evt) {
		return encryptAndSend();
	});
	rcmail.addEventListener(events['beforesavedraft'] || 'beforesavedraft', function (evt) {
		return encryptAndSend(true);
	});
	rcmail.addEventListener(events['beforeload-images'] || 'beforeload-images', function (evt) {
		if (ECClientCFG.internalSafeMode){
			unsecureImgs();
			return false;
		}
	});

	rcmail.addEventListener(events['beforereply'] || 'beforereply', function (evt) {
		
	});

	rcmail.addEventListener(events['beforereply-all'] || 'beforereply-all', function (evt) {
		
	});

	rcmail.addEventListener(events['beforereply-list'] || 'beforereply-list', function (evt) {
		
	});

	rcmail.addEventListener(events['reply'] || 'reply', function (evt) {
		
	});
	
	/*
	 * PROTOTYPES
	 */

	/** ****************************************************** */
	/* Wrap add_message_row of app.js */
	/** ****************************************************** */

	// Reference to the original add_message_row() function
	rcube_webmail.prototype.add_message_row_wrapper = rcmail.add_message_row;

	// Delete add_message_row() from rcmail and replace it with a wrapping function
	delete rcmail.add_message_row;
	rcube_webmail.prototype.add_message_row = function (uid, cols, flags, attop, options) {
		if (!cols.folder)cols.folder=flags.mbox;
		if (!options || !options.nocache){
			if (ECClientCFG.listCache && ECClientCFG.cacheMessageList && rcmail.env.current_page==1 && !rcmail.__searchResult) {
				ecc.setEmailCache(JSON.stringify([cols,flags,attop]), uid.toString(), true, "listCache"+flags.mbox, "listCacheLimit", "listCacheSizePerItem", "listCachePurge");
			}
		}
		
		// If message is new create a new entry
		if (!this.env.messages[uid])
			this.env.messages[uid] = {};
		
		// If EIDX flag exists, email is encrypted.
		$.extend(this.env.messages[uid], {
			ec_encrypted: flags.eidx ? 1 : 0,
			ec_size: flags.size
		});
		
		// Call original function
		rcmail.add_message_row_wrapper(uid,cols,flags,attop);
	};
	rcmail._set_message_coltypes=rcmail.set_message_coltypes;
	rcmail.set_message_coltypes=function(listcols, repl, smart_col){
		var allclsmap={};
		allclsmap['threads']={"className":"threads","id":"rcmthreads","html":"<a href=\"#list-options\" onclick=\"return rcmail.command('menu-open', 'messagelistmenu', this, event)\" class=\"listmenu\" id=\"listmenulink\" title=\"List options...\" tabindex=\"0\">List options...<\/a>"};
		allclsmap['fromto']={"className":"fromto","id":"rcmfromto","html":"<span class=\"fromto\">From<\/span>"};
		allclsmap['subject']={"className":"subject","id":"rcmsubject","html":"<span class=\"subject\">Subject<\/span>"};
		allclsmap['date']={"className":"date","id":"rcmdate","html":"<span class=\"date\">Date<\/span>"};
		allclsmap['attachment']={"className":"attachment","id":"rcmattachment","html":"<span class=\"attachment\">Attachment<\/span>"};
		allclsmap['folder']={"className":"folder","id":"rcmfolder","html":"<span class=\"folder\">Folder<\/span>"};
		repl=[];
		if (rcmail.__searchResult){
			listcols=["threads","fromto","subject","date","attachment","folder"];
			smart_col="from";
		}
		for(var i=0;i<listcols.length;i++){
			repl.push(allclsmap[listcols[i]]);
		}
		return rcmail._set_message_coltypes(listcols, repl, smart_col);
	};
	rcmail._qsearch=rcmail.qsearch;
	rcmail.qsearch=function(value){
		rcmail.clear_previewcontent();
		return rcmail._qsearch(value);
	};
	rcmail._set_rowcount=rcmail.set_rowcount;
	rcmail.set_rowcount=function(text, mbox){
		rcmail.__searchResult=false;
		return rcmail._set_rowcount(text,mbox);
	};

	rcmail.__command=rcmail.command;
	rcmail.command=function(command, props, obj, event, skipDefault){
		if (!skipDefault){
			if (rcmail.task == 'mail' && rcmail.env.action == 'compose' && !rcmail.env.server_error && command != 'save-pref'
		        && $.inArray(command, rcmail.env.compose_commands) < 0
		    ) {
		        if (!rcmail.env.is_sent && rcmail.cmp_hash != rcmail.compose_field_hash() && !confirm(rcmail.get_label('notsentwarning'),rcmail.command,[command,props,obj,event,true]))
		            return false;
		    }
		}
		return rcmail.__command(command, props, obj, event);
	};
	rcmail._params_from_uid=rcmail.params_from_uid;
	rcmail.params_from_uid = function (uid, params) {
        params=rcmail._params_from_uid(uid, params);
        if (ECClientCFG.emailCache && ecc.isEmailCached(uid.toString())){
        	params._ec_cache=2;
        }
        
        return params;
    };
    rcmail._open_compose_step=rcmail.open_compose_step;
    rcmail.open_compose_step=function(p){
    	var uid=p._reply_uid || p._forward_uid || p.uid || p._uid;
    	if (uid)uid=uid.toString();
    	if (uid && ECClientCFG.emailCache && ecc.isEmailCached(uid)){
        	p._ec_cache=2;
        }
    	if (ECClientCFG.allowCustomCompose && (!ECClientCFG.customComposeNewOnly || (!uid && !p._draft_uid))){
    		if (rcmail.is_framed())return window.parent.customComposeFromRC(p);
    		return customComposeFromRC(p);
    	}
    	else {
    		return rcmail._open_compose_step(p);
    	}
    	return;
    };
    rcmail._show_contentframe = rcmail.show_contentframe;
    rcmail.show_contentframe = function(show){
    	if (!show) obj.clearAllNotifcations({loading:true},true);
    	if (ECClientCFG.defaultShowContentFrame)return rcmail._show_contentframe(show);
    	
    	var frame, win, name = rcmail.env.contentframe;

        if (name && (frame = rcmail.get_frame_element(name))) {
            if (!show && (win = rcmail.get_frame_window(name))) {
                if (ECClientCFG.frameBlankpage && win.location.href.indexOf(rcmail.env.blankpage) < 0) {
                    if (win.stop)
                        win.stop();
                    else // IE
                        win.document.execCommand('Stop');
                    
                    win.location.href = rcmail.env.blankpage;
                }
            }
            else if (!bw.safari && !bw.konq)
                $(frame)[show ? 'show' : 'hide']();
        }
    };
    rcmail.location_lasturl=function(){
    	if (rcmail._urls)return rcmail._urls[rcmail._urls.length-1];
    	return "";
    };
    rcmail._goto_url=rcmail.goto_url;
    rcmail.goto_url=function(action, query, lock, secure){
    	var url = rcmail.url(action, query)
        if (secure) url = rcmail.secure_url(url);
        if (url.indexOf('&download=1')>=0 || url.indexOf('&_download=1')>=0)window.open(url);
        else rcmail.redirect(url, lock);
    };
    rcmail._location_href=rcmail.location_href;
    rcmail.location_href=function(url, target, frame){
    	var lasturl=rcmail.location_lasturl();
    	if (typeof url == 'object')
            url = rcmail.env.comm_path + '&' + $.param(url);

        if (bw.ie && target == window)
            $('<a>').attr('href', url).appendTo(document.body).get(0).click();
        else {
            if (!rcmail._urls)rcmail._urls=[];
            var same=(lasturl==url);
            if (!same){
            	if (url && lasturl)rcmail.clear_previewcontent();
            }
            rcmail._urls.push(url);
        	if (!same)target.location.href = url;
        }

        // reset keep-alive interval
		rcmail.start_keepalive();
    };
    rcmail._lock_frame=rcmail.lock_frame;
    rcmail.lock_frame=function(){
    	
    };
    rcmail._start_keepalive=rcmail.start_keepalive;
    rcmail.start_keepalive=function(){
    	if (ECClientCFG.enableKeepAlive){
    		return rcmail._start_keepalive();
    	}
    };
    rcmail._refresh=rcmail.refresh;
    rcmail.refresh = function () {
    	if (rcmail.busy){
    		 setTimeout(function () {
    			 rcmail.refresh();
    			 rcmail.start_refresh();
             }, 10000);
             return;
    	}
        var params = {};
        if (rcmail.task == 'mail' && rcmail.gui_objects.mailboxlist)
            params = rcmail.check_recent_params();
        params._last = Math.floor(rcmail.env.lastrefresh.getTime() / 1000);
        rcmail.env.lastrefresh = new Date();
        rcmail.http_post('refresh', params);
    };
    rcmail.addFolderMessagesFromCache = function(f){
    	if (ECClientCFG.listCache && ECClientCFG.cacheMessageList){
	    	var id="listCache"+f;
	    	var c=ecc.getCachedEmailUids(null,id);
	    	if (c && c.length>0){
	    		for(var i=0;i<c.length;i++){
	    			var cd=ecc.getEmailCache(c[i], id);
	    			if (cd) cd=JSON.parse(cd);
	    			rcmail.add_message_row(parseInt(c[i]),cd[0],cd[1],cd[2],{nocache:true});
	    		}
	    	}
    	}
    };
    rcmail.updateFolderCache = function(uid, handler){
    	if (ECClientCFG.listCache && ECClientCFG.cacheMessageList && rcmail.env.mailboxes_list){
			uid=uid.toString();
    		for(var i=0;i<rcmail.env.mailboxes_list.length;i++){
				var mb=rcmail.env.mailboxes_list[i];
				var c=ecc.getEmailCache(uid, "listCache"+mb);
				if (c){
					c=JSON.parse(c);
					c=handler ? handler(c, uid, mb) : null;
					if (c)ecc.setEmailCache(JSON.stringify(c), uid, 2, "listCache"+mb, "listCacheLimit", "listCacheSizePerItem", "listCachePurge");
					else ecc.delCachedEmail(uid, "listCache"+mb);
				}
			}
		}
    };
    rcmail._list_mailbox_remote=rcmail.list_mailbox_remote;
    rcmail.list_mailbox_remote=function(mbox, page, url){
    	rcmail.revertShowMessage();
    	if (typeof url != 'object')
            url = {};
        url._mbox = mbox;
        if (page)
            url._page = page;

        rcmail.http_request('list', url);
        rcmail.update_state({_mbox: mbox, _page: (page && page > 1 ? page : null)});
    };
    $.__ajax=$.ajax;
    $.__cacheAjax=false;
    $.__ajaxData=null;
    $.ajax=function(a,b){
    	if (ECClientCFG.disableAjax)return;
    	if ($.__cacheAjax)$.__ajaxData=[a,b];
    	return $.__ajax(a,b);
    };
    rcmail._http_request=rcmail.http_request;
    rcmail.http_request=function(action, data, lock, type){
    	if (ECClientCFG.disableAjax || (ECClientCFG.enableHTTPFilter && ECClientCFG.disableHTTPActions.indexOf(action)>=0))return;
    	if (type != 'POST') type = 'GET';
        if (typeof data !== 'object') data = rcube_parse_query(data);

        data._remote = 1;
        data._unlock = lock ? lock : 0;
        var result = rcmail.triggerEvent('request' + action, data);
        if (result === false) {
            if (data._unlock)rcmail.set_busy(false, null, data._unlock);
            return false;
        }
        else if (result !== undefined) {
            data = result;
            if (data._action) {
                action = data._action;
                delete data._action;
            }
        }
        var url = rcmail.url(action);
        rcmail.start_keepalive();
        
        if (!ECClientCFG.disableAjax){
        	switch(action){
        	case 'search':
        		rcmail.__searchmsgid=rcmail.display_message(rcmail.get_label('ec_plugin.msg_searching'),'loading');
        		break;
        	case 'move':
        		rcmail.disableListUpdate(true);
        		break;
        	case 'mark':
        		rcmail.disableListUpdate(true);
        		break;
        	case 'delete':
        		rcmail.disableListUpdate(true);
        		break;
        	}
        }
        
        return $.ajax({
            type: type, url: url, data: data, dataType: 'json',
            success: function (rdata) {
            	if (!ECClientCFG.offlineMode){
            		rcmail.http_response(rdata,data,action);
            	}
            },
            error: function (o, status, err) {
            	rcmail.http_error(o, status, err, lock, action);
            }
        });
    };
    rcmail.disableListUpdate=function(flag){
    	rcmail.__disableListUpdate=flag;
    };
    rcmail.checkListRequiredUpdate=function(){
    	rcmail.disableListUpdate(false);
    	if (rcmail.__listRequiresUpdate){
    		rcmail.__listRequiredUpdate=false;
    		rcmail.command('checkmail');
			setTimeout(function(){
				rcmail.list_mailbox();
			},500);
    	}
    };
    rcmail._http_response=rcmail.http_response;
    rcmail.http_response=function(response, request, action){
    	if (ECClientCFG.disableAjax || (ECClientCFG.enableHTTPFilter && ECClientCFG.disableHTTPActions.indexOf(action)>=0))return;
    	
    	switch(action)
    	{
    	case "list":
    	case "refresh":
    	case "check-recent":
    		if (rcmail.__disableListUpdate){
    			rcmail.__listRequiresUpdate=true;
    			return;
    		}
    		response._request=request;
    		if (rcmail.task=='mail' && request._mbox!=rcmail.env.mailbox){
    			response=null;
        	}
    		break;
    	case "search":
    		rcmail.__searchResult=true;
    		rcmail.hide_message(rcmail.__searchmsgid,'loading');
    		break;
    	case 'mark':
    		rcmail.checkListRequiredUpdate();
    		break;
    	case 'move':
    		if (request._target_mbox==rcmail.env.trash_mailbox && rcmail.env.action=='show' && rcmail.env.task=='mail'){
    			if (getECSessions('mail','').length>0 || getECSessions('mail','list').length>0){
    				window.close();
    			} else {
    				rcmail.command('switch-task','mail');
    			}
	    		return;
    		} else {
    			rcmail.checkListRequiredUpdate();
    		}
    		break;
    	case 'delete':
    		if (rcmail.env.action=='show' && rcmail.env.task=='mail'){
    			if (getECSessions('mail','').length>0 || getECSessions('mail','list').length>0){
    				window.close();
    			} else {
    				rcmail.command('switch-task','mail');
    			}
	    		return;
    		} else {
    			rcmail.checkListRequiredUpdate();
    		}
    		break;
    	}
    	
    	return rcmail._http_response(response);
    };
    rcmail.addEventListener("selectfolder", function(d){
    	if (rcmail.task!='mail')return
    	var f=d.folder;
    	if (f==rcmail.env.mailbox)return;
    	rcmail.clear_previewcontent();
    	setTimeout(function(){
    		rcmail.message_list.clear();
    		rcmail.message_list.clear_selection();
    		rcmail.env.messages={};
    		rcmail.addFolderMessagesFromCache(f);
    		if(ECClientCFG.listSelect && ECClientCFG.cacheListSelect){
	    		var msgs=getSortedMessages();
	    		if (msgs.length>0){
	    			rcmail.show_contentframe(true);
	    			rcmail.message_list.select(msgs[0]);
	    		}
    		}
    	},0);
    });
    function beforeList(r){
    	if (rcmail.task=='mail'){
			if (r.response._request._mbox==rcmail.env.mailbox){
				if (rcmail.message_list.last_selected)rcmail.message_list.beforelistselection=rcmail.message_list.last_selected.toString();
				else rcmail.message_list.beforelistselection=null;
				if (r.response.action=="list" || r.response.exec.indexOf('this.message_list.clear(')>=0 || r.response.exec.indexOf('this.clear_message_list(')>=0)
				{
					rcmail.message_list.clear();
					rcmail.message_list.clear_selection();
					rcmail.env.messages={};
					ecc.clearEmailCache("listCache"+rcmail.env.mailbox);
				}
			}
		}
    };
    function afterList(r, nousebefore){
    	if (rcmail.task=='mail'){
			if(ECClientCFG.listSelect){
				var msgs=getSortedMessages();
	    		if (msgs.length>0){
	    			rcmail.show_contentframe(true);
	    			if (!nousebefore && rcmail.message_list.beforelistselection && msgs.indexOf(rcmail.message_list.beforelistselection)>=0)
	    				rcmail.message_list.select(rcmail.message_list.beforelistselection);
	    			else
	    				rcmail.message_list.select(msgs[0]);
	    		}
			}
			if (rcmail.message_list.get_selection().length==0){
				rcmail.stop_previewAnime();
			}
		}
    };
	rcmail.addEventListener('responsebeforelist', function(r){
		beforeList(r);
	});
	rcmail.addEventListener('responsebeforerefresh', function(r){
		beforeList(r);
	});
	rcmail.addEventListener('responsebeforecheck-recent', function(r){
		beforeList(r);
	});
	rcmail.addEventListener('responseafterlist', function(r){
		afterList(r);
	});
	rcmail.addEventListener('responseafterrefresh', function(r){
		afterList(r);
	});
	rcmail.addEventListener('responseaftercheck-recent', function(r){
		afterList(r);
	});
	rcmail.addEventListener('responseaftersearch', function(r){
		afterList(r,true);
	});
	rcmail._toggle_read_status=rcmail.toggle_read_status;
	rcmail.toggle_read_status=function(flag, a_uids){
		return rcmail._toggle_read_status(flag, a_uids);
	};
	rcmail._toggle_delete_status=rcmail.toggle_delete_status;
	rcmail.toggle_delete_status=function(r_uids){
		return rcmail._toggle_delete_status(r_uids);
	};
	rcmail._flag_as_deleted=rcmail.flag_as_deleted;
	rcmail.flag_as_deleted=function(a_uids){
		return rcmail._flag_as_deleted(a_uids);
	};
	rcmail._delete_messages=rcmail.delete_messages;
	rcmail.delete_messages=function(event){
		if (ECClientCFG.permamentDeleteInShow && rcmail.env.action=='show' && rcmail.env.task=='mail'){
			rcmail.permanently_remove_messages();
			return true;
		}
		if (ECClientCFG.permanentDeleteInList && (!rcmail.env.action || rcmail.env.action=='list') && rcmail.env.task=='mail'){
			rcmail.permanently_remove_messages();
			return true;
		}
		setTimeout(function(){
			if (rcmail.updateMessageToolbarButtons) rcmail.updateMessageToolbarButtons();
		},0);
		return rcmail._delete_messages(event);
	};
	rcmail._copy_messages=rcmail.copy_messages;
	rcmail.copy_messages = function (mbox, event) {
        if (mbox && typeof mbox === 'object')
            mbox = mbox.id;
        else if (!mbox)
            return rcmail.folder_selector(event, function (folder) {
            	rcmail.command('copy', folder);
            });
        
        if (!mbox || mbox == rcmail.env.mailbox)
            return;
        
        if (ECClientCFG.debugExt)log('copy',mbox);
        if (ecc.isForbiddenFolder(mbox)){
        	if (ECClientCFG.debugExt)log('forbidden copy');
        	if (rcmail.__dmfid)rcmail.hide_message(rcmail.__dmfid);
    		rcmail.__dmfid=rcmail.display_message(rcmail.get_label('ec_plugin.msg_invalidcopy').replace('#F',mbox));
        	return;
        }
        var post_data = rcmail.selection_post_data({_target_mbox: mbox});
        if (!post_data._uid)
            return;
        
        rcmail.http_post('copy', post_data, rcmail.display_message(rcmail.get_label('copyingmessage'), 'loading'));
    };
	rcmail._move_messages=rcmail.move_messages;
	rcmail.move_messages=function(mbox, event){
		var mb=mbox;
		if (mb && typeof mb === 'object')mb = mb.id;
		if (ECClientCFG.debugExt)log('move',mb)
		if (ecc.isForbiddenFolder(mb)){
			if (ECClientCFG.debugExt)log('forbidden move');
			if (rcmail.__dmfid)rcmail.hide_message(rcmail.__dmfid);
    		rcmail.__dmfid=rcmail.display_message(rcmail.get_label('ec_plugin.msg_invalidmove').replace('#F',mb));
			return;
		}
		if (mb){
			if (rcmail.message_list){
				var sel=getSortedMessages(rcmail.message_list.get_selection()).reverse();
				var puid=rcmail.get_preview_uid() || "";
				for(var n=0;n<sel.length;n++){
					var id=sel[n];
					if (ECClientCFG.debugExt)log("move",	puid,id)
					if (puid.toString()==id.toString()){
						rcmail.clear_previewcontent();
					}
					var c=ecc.getEmailCache(id.toString(), "listCache"+rcmail.env.mailbox);
					rcmail.updateFolderCache(id, function(c,uid,_mb){
						return null;
					});
					if (c){
						c=JSON.parse(c);
						if (c){
							c[1].mbox=mb;
							ecc.setEmailCache(JSON.stringify(c), id.toString(), 2, "listCache"+mb, "listCacheLimit", "listCacheSizePerItem", "listCachePurge", true);
						}
					}
				}
			}
		}
		setTimeout(function(){
			if (rcmail.updateMessageToolbarButtons) rcmail.updateMessageToolbarButtons();
			
		},0);
		return rcmail._move_messages(mbox, event);
	};
	rcmail.stop_previewAnime=function(){
		try{
			rcmail.get_frame_element(rcmail.env.contentframe).contentDocument.body.className='static-body';
		} catch(e){
			
		}
	};
	rcmail.start_previewAnime=function(){
		try{
			rcmail.get_frame_element(rcmail.env.contentframe).contentDocument.body.className='';
		} catch(e){
			
		}
	};
	rcmail.clear_previewcontent=function(){
		 if (!rcmail._urls)rcmail._urls=[];
		rcmail._urls.push("");
    	rcmail._show_contentframe(false);
    	var frame=rcmail.get_frame_window(rcmail.env.contentframe);
    	if (frame && frame.displayLockBoardLoader)frame.displayLockBoardLoader();
    	rcmail.start_previewAnime();
	};
	rcmail.get_preview_uid=function(){
		if (!rcmail.env.contentframe || !rcmail.get_frame_window(rcmail.env.contentframe))
			return;
		try{
			return rcmail.get_frame_window(rcmail.env.contentframe).rcmail.get_single_uid();
		} catch(e){
			
		}
		return;
	};
	rcmail._permanently_remove_messages=rcmail.permanently_remove_messages;
	rcmail.permanently_remove_messages=function(){
		if (rcmail.message_list){
			var sel=rcmail.message_list.get_selection();
			var puid=rcmail.get_preview_uid() || "";
			for(var n=0;n<sel.length;n++){
				var id=sel[n];
				if (ECClientCFG.debugExt)log("perm remove",puid,id)
				if (puid.toString()==id.toString())rcmail.clear_previewcontent();
				rcmail.updateFolderCache(id, function(c,uid,mb){
					return null;
				});
			}
		}
		return rcmail._permanently_remove_messages();
	};
	rcmail._set_message=rcmail.set_message;
	rcmail.set_message=function(uid, flag, status){
		rcmail.start_previewAnime();
		rcmail.updateFolderCache(uid, function(c,uid,mb){
			if (flag=='unread')c[1].seen=status ? 0 : 1;
			return c;
		});
		return rcmail._set_message(uid, flag, status);
	};
	rcmail._set_busy=rcmail.set_busy;
	rcmail.set_busy=function(a, message, id){
		var r=rcmail._set_busy(a, message, id);
		if (ECClientCFG.noBusy)rcmail.busy=false;
		return r;
	};
	rcmail._get_label=rcmail.get_label;
	rcmail.get_label=function(name, domain){
		if (ECClientCFG.disabledMessages[name]) return ECClientCFG.disabledMessageString;
		return rcmail._get_label(name, domain);
	};
	rcmail._display_message=rcmail.display_message;
	rcmail.display_message=function(msg, type, timeout, key) {
		if (type=='error')return;
		if (type=='ec_error')type='error';
		if (ECClientCFG.hookMessages[msg]){
			var stop=false;
			for(var i=0;i<ECClientCFG.hookMessages[msg].length;i++){
				var r=ECClientCFG.hookMessages[msg][i]();
				if (r)stop=true;
			}
			if (stop)return;
		}
		if (msg==ECClientCFG.disabledMessageString) return;
		return rcmail._display_message(msg, type, timeout, key);
	};
	rcmail.hook_message=function(msg, handler){
		if (!ECClientCFG.hookMessages[msg])ECClientCFG.hookMessages[msg]=[];
		ECClientCFG.hookMessages[msg].push(handler);
	};
    rcmail._drag_start=rcmail.drag_start;
    rcmail.drag_start=function(list){
    	if (!ECClientCFG.disableDrag)
    		return rcmail._drag_start(list);
    };
    rcmail._drag_move=rcmail.drag_move;
    rcmail.drag_move = function (e) {
        if (rcmail.gui_objects.folderlist) {
            var drag_target, oldclass,
                layerclass = 'draglayernormal',
                mouse = rcube_event.get_mouse_pos(e);

            if (rcmail.contact_list && rcmail.contact_list.draglayer)
                oldclass = rcmail.contact_list.draglayer.attr('class');

            if (rcmail.treelist && (drag_target = rcmail.treelist.intersects(mouse, true))) {
            	if (ecc.isForbiddenFolder(drag_target)){
            		
            		rcmail.env.last_folder_forbidden = drag_target;
            		rcmail.env.last_folder_target = null;
        			return;
            	}
            	rcmail.env.last_folder_target = drag_target;
                layerclass = 'draglayer' + (rcmail.check_droptarget(drag_target) > 1 ? 'copy' : 'normal');
            }
            else {
            	rcmail.env.last_folder_target = null;
            }

            if (layerclass != oldclass && rcmail.contact_list && rcmail.contact_list.draglayer)
            	rcmail.contact_list.draglayer.attr('class', layerclass);
        }
    };
    rcmail._drag_end=rcmail.drag_end;
    rcmail.drag_end=function(e){
    	if (!rcmail.env.last_folder_target && rcmail.env.last_folder_forbidden){
    		if (rcmail.__dmfid)rcmail.hide_message(rcmail.__dmfid);
    		rcmail.__dmfid=rcmail.display_message(rcmail.get_label('ec_plugin.msg_invalidmove').replace('#F',rcmail.env.last_folder_forbidden));
    		rcmail.env.last_folder_forbidden=null;
    	}
    	return rcmail._drag_end(e);
    };
    
    rcmail._editor_init=rcmail.editor_init;
    rcmail.editor_init=function (config, id) {
    	window.rcmail_editor_settings={};
    	window.rcmail_editor_settings.toolbar= 'bold italic underline | alignleft aligncenter alignright alignjustify'
            + ' | bullist numlist outdent indent ltr rtl blockquote | forecolor backcolor | fontselect fontsizeselect'
            + ' | link unlink table | undo redo';
    	return rcmail._editor_init(config, id);
    };
	
    rcmail._folder_selector=rcmail.folder_selector;
    rcmail.folder_selector=function (event, callback) {
        var container = rcmail.folder_selector_element;

        if (!container) {
            var rows = [],
                delim = rcmail.env.delimiter,
                ul = $('<ul class="toolbarmenu">'),
                link = document.createElement('a');

            container = $('<div id="folder-selector" class="popupmenu"></div>');
            link.href = '#';
            link.className = 'icon';
            rows.push($('<li><input id="foldersearch" placeholder="'+rcmail.get_label('ec_plugin.searchfolder')+'" type="text"/></li>'));
            // loop over sorted folders list
            $.each(rcmail.env.mailboxes_list, function () {
                var n = 0, s = 0,
                    folder = rcmail.env.mailboxes[this],
                    id = folder.id,
                    a = $(link.cloneNode(false)),
                    row = $('<li>');

                if (folder.virtual)
                    a.addClass('virtual').attr('aria-disabled', 'true').attr('tabindex', '-1');
                else
                    a.addClass('active').data('id', folder.id);

                if (folder['class'])
                    a.addClass(folder['class']);

                // calculate/set indentation level
                while ((s = id.indexOf(delim, s)) >= 0) {
                    n++;
                    s++;
                }
                a.css('padding-left', n ? (n * 16) + 'px' : 0);

                // add folder name element
                a.append($('<span>').text(folder.name));

                row.append(a);
                rows.push(row);
            });

            ul.append(rows).appendTo(container);

            // temporarily show element to calculate its size
            container.css({left: '-1000px', top: '-1000px'})
                .appendTo($('body')).show();

            // set max-height if the list is long
            if (rows.length > 10)
                container.css('max-height', $('li', container)[0].offsetHeight * 10 + 9);

            // register delegate event handler for folder item clicks
            container.on('click', 'a.active', function (e) {
                container.data('callback')($(this).data('id'));
                return false;
            });

            rcmail.folder_selector_element = container;
            
            function searchInFolders(val){
            	$('a.active',container).each(function(){
            		var a=$(this);
            		var id=a.data('id');
            		if (!val || id.toLowerCase().indexOf(val.toLowerCase())>=0)a.show();
            		else a.hide();
            	});
            };
            
            $('#foldersearch').mousedown(function(e){
            	$('#foldersearch').focus();
            	return false;
            }).mouseup(function(e){
            	e.preventDefault();
            	e.stopImmediatePropagation();
            	return false;
            }).change(function(e){
            	searchInFolders($('#foldersearch').val());
            }).keyup(function(e){
            	searchInFolders($('#foldersearch').val());
            });
        }
        $('#foldersearch').val('').change();
        container.data('callback', callback);

        // position menu on the screen
        rcmail.show_menu('folder-selector', true, event);
    };
    rcmail.revertShowMessage=function(){
    	$('body').removeClass('ec_showpreview');
    	
    	return false;
    };
    rcmail._msglist_dbl_click=rcmail.msglist_dbl_click;
    rcmail.msglist_dbl_click=function(list){
    	rcmail._fromdblclick=true;
    	return rcmail._msglist_dbl_click(list);
    };
    rcmail._show_message=rcmail.show_message;
    rcmail.show_message=function(id, safe, preview){
    	if (rcmail._fromdblclick){
    		rcmail._fromdblclick=false;
    		var pt=$('#mailpreviewtoggle');
    		if (!pt.hasClass('enabled'))pt.click();
    		$('body').addClass('ec_showpreview');
        	return rcmail._show_message(id, safe, true);
    	} else {
    		return rcmail._show_message(id, safe, preview);
    	}
    };
    
	obj.constructor=this;
	
	return obj;
}

var mimeTypes=ECClientCFG.mimeTypes;
var contentTypes=ECClientCFG.contentTypes;
var dispositionTypes=ECClientCFG.dispositionTypes;
var trueContentTypes=ECClientCFG.trueContentTypes;
var imgContentTypes=ECClientCFG.imgContentTypes;
var pkd;

var ecc=new ECClient(rcmail, ECClientCFG)
var ecobj=ecc.initEC().ecobj;

/*
 * ENCRYPT DECRYPT
 */

function invalidPopupOnSend(invalidNonencUsers, handler, customcfg, components){
	var invalidPopupBtns=[];
	var invalidPopupTitle='';
	if (!customcfg.mixedRecipientMode){
		invalidPopupBtns=[{
			text: ecobj.get_label('ec_plugin.invalid_mode2'),
			click: function () {
				customcfg.allowInvalidEncrypt=true;
				customcfg.enforceNonencryptSend=true;
				customcfg.enforceEncryptSend=false;
				setEncryption(false, components.encO);
				var $dialog = $(this);
				$dialog.dialog('close');
				handler();
			}
		},
		{
			text: ecobj.get_label('ec_plugin.invalid_invite'),
			click: function () {
				var $dialog = $(this);
				$dialog.dialog('close');
				openInvitePopup(invalidNonencUsers, true, function(){
					handler();
				});
			}
		},
		{
			text: ecobj.get_label('ec_plugin.invalid_emails_cancel'),
			click: function () {
				var $dialog = $(this);
				$dialog.dialog('close');
			}
		}];
		if (!customcfg.addInviteBtnToMixedRecipientsPopup)invalidPopupBtns.splice(1,1);
		var invalidNonencUsersString=invalidNonencUsers.join(', ');
		if (invalidNonencUsersString.length>72)invalidNonencUsersString=invalidNonencUsersString.substr(0, 69)+'...';
		invalidPopupTitle=ecobj.get_label('ec_plugin.invalid_title_mode2').replace('<list>',html_encode(invalidNonencUsersString));
	} else {
		invalidPopupBtns=[{
			text: ecobj.get_label('ec_plugin.invalid_emails_ok'),
			click: function () {
				customcfg.allowInvalidEncrypt=true;
				var $dialog = $(this);
				$dialog.dialog('close');
				handler();
			}
		},
		{
			text: ecobj.get_label('ec_plugin.invalid_emails_cancel'),
			click: function () {
				var $dialog = $(this);
				$dialog.dialog('close');
			}
		}];
		invalidPopupTitle=ecobj.get_label('ec_plugin.invalid_emails_msg');
	}
	rcmail.show_popup_dialog(
		'<div class="invalid-emails-title">'+invalidPopupTitle+'</div>',
		ecobj.get_label('ec_plugin.invalid_emails_title'),
		invalidPopupBtns,
		{
			resizable:false,
			dialogClass:'invalid-emails-dialog'
		}
	);
}

//encryptAndSend(Boolean draft, ECClientCFG customcfg, Object components, Function handler, Function returnHandler, Function initHandler):void
function encryptAndSend(draft, customcfg, components, handler, returnHandler, initHandler){
	if (initHandler)initHandler();
	if (!customcfg)customcfg=ECClientCFG;
	if (!components)components={};
	if (!components.to)components.to=$("#_to").val();
	if (!components.cc)components.cc=$("#_cc").val();
	if (!components.bcc)components.bcc=$("#_bcc").val();
	if (!components.encO)components.encO=$('#ec_rcmcomposeenc');
	if (!components.hasContent)components.hasContent=hasContent;
	if (!components.subjO)components.subjO=$('#compose-subject');
	if (!components.textO)components.textO=$("#composebody");
	if (!components.isHtmlEditor)components.isHtmlEditor=isHtmlEditor;
	if (!components.getHtmlEditor)components.getHtmlEditor=getHtmlEditor;
	if (!components.generateEncryptUsers)components.generateEncryptUsers=generateEncryptUsers;
	if (!components.lockSubmitForm)components.lockSubmitForm=lockSubmitForm;
	if (!components.unlockSubmitForm)components.unlockSubmitForm=unlockSubmitForm;
	if (!components.checkEncStatus)components.checkEncStatus=checkEncStatus;
	if (!components.showTitleInput)components.showTitleInput=showTitleInput;
	if (!components.setBoundary)components.setBoundary=function(v){$('#ec_rcmcomposeboundary').val(v);};
	if (!components.setType)components.setType=function(v){$('#ec_type').val(v);};
	if (!components.attachments)components.attachments=customcfg.attachments;
	
	var recipients=extractEmails(components.to);
	if (!customcfg.strictToRecipients){
		recipients=recipients.concat(extractEmails(components.cc));
		recipients=recipients.concat(extractEmails(components.bcc));
	}
	if (recipients.length==0 && !draft){
		var msg = ecobj.get_label('ec_plugin.input_recipients');
		rcmail.display_message(msg,'ec_error',120000);
		if (returnHandler)returnHandler('rec');
		return false;
	}
	else {
		if (customcfg.autoCacheRecipients) pushRecipientsToLocalStorage(recipients);
	}
	if (draft && customcfg.enforceDraftEncrypt)setEncryption(true, components.encO);
	if (!customcfg.noBodyEncryption && !hasAttachments(components) && !components.hasContent() && needsEncryption(customcfg, components.encO)){
		components.encO.click();
	}
	var needsEnc=needsEncryption(customcfg, components.encO);
	var hasAtt=hasAttachments(components);
	
	if (customcfg.enforceAjaxSend || needsEnc || (hasAtt && customcfg.readUploads)){
		if (!draft && components.subjO.val().length==0){
			components.showTitleInput(function(){
				encryptAndSend(draft, customcfg, components, handler, returnHandler, initHandler);
			}, components.subjO);
			if (returnHandler)returnHandler('subject');
			return false;
		}
		var invalidNonencUsers=components.generateEncryptUsers(false);
		
		if (!draft && needsEnc && !customcfg.allowInvalidEncrypt && invalidNonencUsers.length>0){
			invalidPopupOnSend(invalidNonencUsers, function(){
				encryptAndSend(draft, customcfg, components, handler, returnHandler, initHandler);
			}, customcfg, components);
			if (returnHandler)returnHandler('invalid');
			return false;
		}
		
		var id=null;
		if (!components._l1)id= rcmail.display_message(!needsEnc ? customcfg.msgFormat.loading : (draft ? ecobj.get_label('ec_plugin.msg_encrypt_draft') : customcfg.msgFormat.encrypt), 'loading');
		components.lockSubmitForm();
		
		components.textO[0].readOnly = true;
		var emailBody = components.textO.val();
		var rawBody=emailBody;
		var initbody=rawBody;
		var orawBody;
		var oemailBody;
		var toEncrypt=1;
		var sendBody='';
		var relateParts;
		var beforeSendHandler;
		var validUsers=components.generateEncryptUsers(true);
		
		function onencrypted(){
			toEncrypt--;
			if (toEncrypt==0){
				if (beforeSendHandler)beforeSendHandler();
				let finalcnt=toNL(sendBody);
				var bytesize=getStringByteSize(finalcnt);
				
				if (bytesize>customcfg.maxBytes){
					if (!components._l1)rcmail.hide_message(id, 'loading');
					if (components.isHtmlEditor()) {
						components.getHtmlEditor().save=components.getHtmlEditor().__save;
						components.getHtmlEditor().setMode('design');
					}
					components.textO[0].readOnly = false;

					var msg = ecobj.get_label('ec_plugin.send_mail_max_size');
					var data = {max_size : getSizeFormat(ECClientCFG.maxBytes), cur_size : getSizeFormat(bytesize)};
					$.each(['max_size', 'cur_size'], function() {
						msg = msg.replace('$' + this, data[this]);
					});
					rcmail.display_message(msg,'ec_error',0);
					components.checkEncStatus();
					components.unlockSubmitForm();
					if (returnHandler)returnHandler('size');
				}
				else {
					components.textO.val(finalcnt);
					if (!components._f1){
						$('#composebodycontainer [name=_is_html]').val('0');
						$('[name=_attachments]').remove();
					}
					if (!components._l1)rcmail.hide_message(id, 'loading');
					if (hasAtt){
						for(var a=0;a<components.attachments.length;a++){
							var att=components.attachments[a];
							delete att.type2;
							delete att.name2;
							delete att.data2;
							delete att.encrypted;
						}
					}
					
					submitMessageForm(draft, {
							initbody:initbody, needsEnc:needsEnc, hasAtt:hasAtt, multisend:customcfg.enableMultiSend,
							emailBody:oemailBody, rawBody:orawBody, relateParts:relateParts, handler:handler,
							users:components.generateEncryptUsers(),
							validUsers:components.generateEncryptUsers(true),
							invalidUsers:components.generateEncryptUsers(false),
							size:bytesize, 
							attachments:components.attachments,
							htmlEdit:components.isHtmlEditor(),
							form:components.form,
							components:components
					}, customcfg);
					components.checkEncStatus();
					if (draft){
						if (components.isHtmlEditor()) {
							components.getHtmlEditor().save=components.getHtmlEditor().__save;
							components.getHtmlEditor().setMode('design');
						}
						components.textO[0].readOnly = false;
						components.textO.val(initbody);
					}
				}
			}
		}
		
		if (customcfg.enforceHTMLParams){
			if (!components._f1) $('#ec_rcmcomposehtml').val( '1' );
		} else {
			if (!components._f1) $('#ec_rcmcomposehtml').val( $('#composebodycontainer [name=_is_html]').val() );
		}
		
		if (components.isHtmlEditor()) {
			components.getHtmlEditor().setMode('readonly');
			emailBody = components.getHtmlEditor().getContent({format:'html'});
			oemailBody=emailBody;
			rawBody = components.getHtmlEditor().getContent({format:'text'});
			orawBody = rawBody;
			if (customcfg.wrapHtmlBody){
				emailBody=wrapHtmlBody(emailBody);
			}
			components.getHtmlEditor().__save=components.getHtmlEditor().save;
			components.getHtmlEditor().save=function(){};
		}
		else {
			if (customcfg.encodeHtml){
				emailBody=html_encode(emailBody);
				oemailBody=emailBody;
			}
		}
		if (customcfg.wrapMimeBody){
			if (!needsEnc && customcfg.encryptInQuotedPrintable)customcfg.enforceQuotedPrintable=true;
			var mimeEmail;
			if (components.isHtmlEditor()){
				if (!customcfg.plainHtml)rawBody=null;
				var grpo=getRelatedParts(emailBody);
				emailBody=grpo.c;
				relateParts=grpo.r;
				oemailBody=emailBody;
				if (!needsEnc){
					if (hasAtt){
						mimeEmail=wrapMimeBody(rawBody || true, emailBody, relateParts, components.attachments, false, true);
						components.setBoundary(mimeEmail.mb);
					} else {
						mimeEmail=wrapMimeBody(rawBody || true, emailBody, relateParts, null, true, true);
						components.setBoundary(mimeEmail.ab);
						components.setType('alt');
					}
				} else {
					mimeEmail=wrapMimeBody(rawBody || true, emailBody, relateParts, components.attachments);
				}
				emailBody=mimeEmail.body;
			}
			else {
				rawBody=null;
				if (needsEnc && hasAtt){
					toEncrypt+=components.attachments.length;
					for(var a=0;a<components.attachments.length;a++){
						(function(a){
							var att=components.attachments[a];
							if (att.encrypted){
								setTimeout(function(){
									onencrypted();
								},0);
							} else {
								encryptContent(toBinary(att.data),function(msg, bin){
									var result=bin ? fromBinary(msg.packets.write()) : msg;
									att.type2='application/octet-stream';
									att.name2=att.file.name+'.pgp';
									att.data2=result;
									att.encrypted=true;
									onencrypted();
								},true,validUsers,components.from);
							}
						})(a);
					}
					beforeSendHandler=function(){
						mimeEmail=wrapMimeBody(sendBody, rawBody, null, components.attachments, true, true);
						sendBody=mimeEmail.body;
						components.setBoundary(mimeEmail.mb);
					};
				} else {
					mimeEmail=wrapMimeBody(emailBody, rawBody, null, components.attachments, true, true);
					emailBody=mimeEmail.body;
					components.setBoundary(mimeEmail.mb);
				}
			}
		}
		
		if (needsEnc){
			encryptContent(emailBody,function(result){
				sendBody=result;
				onencrypted();
			},false,validUsers,components.from,true);
		} else {
			sendBody=emailBody;
			onencrypted();
		}
		
		return false;
	} else {
		
	}
	if (customcfg.debugEncrypt)log('encryptAndSend',emailBody, needsEncryption(customcfg, components.encO), components.isHtmlEditor());
}

//requestKeyStatus(String email, Function handler, Number timeout, Bool nocache, Bool getkeys, Bool stack):requestKeyStatus Object
function requestKeyStatus(email, handler, timeout, nocache, getkeys, stack){
	var o={};
	var oemail=email;
	if (email)email=extractEmails(email,false)[0];
	o.cache=false;
	o.keycache=null;
	o.e=email;
	o.h=handler;
	
	o.getKeyCache = function(){
		var keycache=localStorage.getItem('keyCache');
		if (keycache) keycache=JSON.parse(keycache);
		if (!keycache)keycache=[];
		return keycache;
	};
	o.setKeyCache = function(keycache, settime){
		if (keycache)setClassStorage('keyCache', JSON.stringify(keycache));
		else localStorage.setItem('keyCache','');
		if (settime) o.setKeyCacheExp(getTime()+ECClientCFG.keyCacheExpiration);
	};
	o.getKeyCacheExp = function(){
		var exp=parseFloat(localStorage.getItem('keyCacheExp'));
		if (!exp || isNaN(exp))exp=0;
		return exp;
	};
	o.setKeyCacheExp = function(exp){
		setClassStorage('keyCacheExp', exp);
	};
	
	o.loadKeyCache = function(){
		o.cache=false;
		if (ECClientCFG.keyCache && ECClientCFG.keyCacheStatus){
			o.keycache=o.getKeyCache();
			if (o.keycache.length<ECClientCFG.keyCacheLimit) o.cache=true;
		} else {
			o.keycache=[];
		}
	};
	
	o.findKey = function (email, remove){
		for(var i=0;i<o.keycache.length;i++){
			if (o.keycache[i].e==email){
				if (remove)o.keycache.splice(i,1);
				return i;
			}
		}
		return -1;
	};
	
	o.cacheKey = function(status,external){
		if (!external)external=0;
		else external=1;
		o.loadKeyCache();
		if (o.cache){
			var k=o.findKey(o.e, true);
			o.keycache.push({e:o.e,s:status,x:external});
			o.setKeyCache(o.keycache, true);
		}
	};
	o.clearKeyCache = function(){
		o.setKeyCache('', false);
		o.setKeyCacheExp('');
	};
	o.requestKeys = function (){
		if (stack){
			if (!requestKeyStatus.prototype.keys)requestKeyStatus.prototype.keys=[];
			requestKeyStatus.prototype.keys.push(o);
			
			setTimeout(function(){
				if (!requestKeyStatus.prototype.keys || requestKeyStatus.prototype.keys.length==0)return;
				var keys=requestKeyStatus.prototype.keys;
				requestKeyStatus.prototype.keys=[];
				
				initPKD();
				var rkeys=[];
				for(var i=0;i<keys.length;i++){
					if (rkeys.indexOf(keys[i].e)==-1)rkeys.push(keys[i].e);
				}
				pkd.getPublicKeys(rkeys, !getkeys).then(function (result) {
					for(var ri=0;ri<keys.length;ri++){
						var ro=keys[ri];
						if (result[ro.e] && result[ro.e].public_key){
							if (ro.cache)ro.cacheKey(true,result[ro.e].external);
							ro.h(ro.e, true, result);
						}	
						else{
							if (ro.cache)ro.cacheKey(false);
							ro.h(ro.e, false, result);
						}
					}
					
				}).catch(function (error) {
					for(var ri=0;ri<keys.length;ri++){
						var ro=keys[ri];
						if (ro.cache)ro.cacheKey(false);
						ro.h(ro.e, false, error);
					}
				});
			}, 0);
		} else {
			initPKD();
			pkd.getPublicKeys([o.e], !getkeys).then(function (result) {
				if (result[o.e] && result[o.e].public_key){
					if (o.cache)o.cacheKey(true,result[o.e].external);
					o.h(o.e, true, result);
				}	
				else{
					if (o.cache)o.cacheKey(false);
					o.h(o.e, false, result);
				}
			}).catch(function (error) {
				if (o.cache)o.cacheKey(false);
				o.h(o.e, false, error);
			}); 
		}
	};
	
	o.init = function(){
		if (!nocache) o.loadKeyCache();
		if (!o.cache) o.requestKeys();
		else {
			var cachekey=o.findKey(o.e);
			if (cachekey>=0){
				o.cacheTimeoutId=setTimeout(function(){
					o.h(o.e,o.keycache[cachekey].s,o.keycache[cachekey].x);
				}, timeout || 0);
			} else {
				o.cacheTimeoutId=setTimeout(function(){
					o.requestKeys();
				}, timeout || 0);
			}
		}
	};
	o.constructor=this;
	if (o.e) o.init();
	
	return o;
}
//getEmailKey(String e, Function h):requestKeyStatus Object
//handler(email, public_key) - no cache
function getEmailKey(e ,h){
	return new requestKeyStatus(e, function(e,s,r){
		var pkey=null;
		try{
			pkey=r[e].public_key;
		}catch(e){}
		h(e,pkey);
	},null,true,true);
}

function submitMessageForm(draft, options, customcfg){
	if (!customcfg)customcfg=ECClientCFG;
	if (customcfg.ajaxSend && (customcfg.queueDrafts || !draft)){
		if (!options)options={};
		var formaction=options.action;
		var formdata=options.data;
		var msgid = null;
		
		var form=options.form;
		var customid=customcfg.customid;
		var customtoken=customcfg.customtoken;
		var initCompose=false;
		var doajax=true;
		var doqueue=true;
		var components=options.components;
		if (!components)components={};
		if (!components.unlockSubmitForm)components.unlockSubmitForm=unlockSubmitForm;
		if (components.formUpdate)components.formUpdate('beforeSubmit', options);
		var composemode=components.composemode || rcmail.env.compose_mode;
		
		if (!components._l1)msgid=rcmail.set_busy(true, draft ? 'savingmessage' : 'sendingmessage');
		if (!formaction && !formdata){
			if (!form) form=rcmail.gui_objects.messageform;
			
			form._draft.value = draft ? '1' : '';
			form._ec_mbox.value=rcmail.env.mailbox;
			var suid=components.suid ? components.suid() : rcmail.get_single_uid();
			if (composemode=="reply"){
				form._ec_reply_uid.value=suid;
			} else if (composemode=="forward"){
				form._ec_forward_uid.value=suid;
			}
			
			formaction=form.action;
			options.formid=form._id.value;
			options.formtoken=form._token.value;
			options.title=form._subject.value;
			
			if (options.needsEnc){
				var valid=options.validUsers;
				var oTO=extractEmails(form._to.value);
				var oCC=extractEmails(form._cc.value);
				var oBCC=extractEmails(form._bcc.value);
				if (valid && !draft){
					var validExtractedNoName=extractEmails(options.validUsers.join(','), false);
					form._to.value=oTO.filter(function(e,i,s){
						var ee=extractEmails(e,false)[0];
						return validExtractedNoName.indexOf(ee)>=0;
					}).join(',');
					form._cc.value=oCC.filter(function(e,i,s){
						var ee=extractEmails(e,false)[0];
						return validExtractedNoName.indexOf(ee)>=0;
					}).join(',');
					form._bcc.value=oBCC.filter(function(e,i,s){
						var ee=extractEmails(e,false)[0];
						return validExtractedNoName.indexOf(ee)>=0;
					}).join(',');
				}
				if (options.multisend && options.initbody && options.invalidUsers && options.invalidUsers.length>0 && !draft){
					initCompose=true;
				}
			}

			//ECClientCFG maxQueueSize
			if (customcfg.localQueue && !draft){
				form._token.value=customtoken;
				form._id.value=customid;
			}
			if (components.formUpdate)components.formUpdate('serialize',options);
			formdata=$(form).serialize();
			var formsize=getStringByteSize(formdata);
			if (draft || formsize>customcfg.maxQueueSize || getECSessions('mail','').length==0){
				doqueue=false;
				form._token.value=options.formtoken;
				form._id.value=options.formid;
				if (components.formUpdate)components.formUpdate('serialize',options);
				formdata=$(form).serialize();
			}
		}
		
		function alterInitCompose(composeid, handler){
			var emailBody=options.initbody;
			if (options.hasAtt) {
				var mimeEmail;
				if (options.htmlEdit){
					mimeEmail=wrapMimeBody(options.rawBody, options.emailBody, options.relateParts, options.attachments, false, true);
				} else {
					mimeEmail=wrapMimeBody(options.emailBody || emailBody, null, null, options.attachments, true, true);
				}
				form._ec_boundary.value=mimeEmail.mb;
				emailBody=mimeEmail.body;
			}
			form._message.value=emailBody;
			var invalid=options.invalidUsers;
			var invalidExtractedNoName=extractEmails(options.invalidUsers.join(','), false);
			form._to.value=oTO.filter(function(e,i,s){
				var ee=extractEmails(e,false)[0];
				return invalidExtractedNoName.indexOf(ee)>=0;
			}).join(',');
			form._cc.value=oCC.filter(function(e,i,s){
				var ee=extractEmails(e,false)[0];
				return invalidExtractedNoName.indexOf(ee)>=0;
			}).join(',');
			form._bcc.value=oBCC.filter(function(e,i,s){
				var ee=extractEmails(e,false)[0];
				return invalidExtractedNoName.indexOf(ee)>=0;
			}).join(',');
			if (composeid) form._id.value=composeid;
			form._ec_enc.value="0";
			try{
			form._ec_enc.checked=false;
			} catch(e){}
			form._is_html.value=options.hasAtt ? '0' : (options.htmlEdit ? "1" : "0");
			if (components.formUpdate)components.formUpdate('serialize',options);
			formdata=$(form).serialize();
			handler(formaction, formdata);
		}
		function prepareInitCompose(handler){
			getComposeId(function(composeid){
				alterInitCompose(composeid, handler);
			},formaction,components.ignorestrict);
		}
		
		if (customcfg.localQueue && doqueue && !draft){
			doajax=false;
			var plqr=pushLocalQueue(formaction,formdata,options.title,options.size);
			if (plqr===false){
				if (customcfg.debugEncrypt)log("local queue failure, transfer to direct ajax");
				doqueue=false;
				doajax=true;
			}
			if (doqueue){
				components.unlockSubmitForm();
				if (initCompose){
					alterInitCompose(customid,function(formaction, formdata){						
						var plqr2=pushLocalQueue(formaction, formdata, options.title, getStringByteSize(options.initbody)*(isHtmlEditor() ? 2 : 1));
						if (plqr===false){
							if (customcfg.debugEncrypt)log("local queue 2 failure, transfer to direct ajax");
							$.ajax({
								type: "POST",	url: formaction,	data:formdata,
								success: function(data){
									rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.ajax_sent'),[],null);
								}
							});
						}
					});
				}
				
				rcmail.remove_compose_data(options.formid);
				rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.queue_add'),[],null);
				if (!customcfg.notifyAddingQueue){
					if (rcmail.env.extwin)rcmail.opener().clear_messages();
					if (rcmail.is_framed)window.parent.rcmail.clear_messages();
					rcmail.clear_messages();
				}
			}
		}
		if (doajax) {
			
			$.ajax({
				type: "POST",	url: formaction,	data:formdata,
				progress: function(e){	if (customcfg.debugEncrypt)log(e);	},
				progressUpload:function(e){	if (customcfg.debugEncrypt)log(e);	},
				success: function(data){
					components.unlockSubmitForm();
					if (options.handler)options.handler();
					if (draft){
						if (data && data.indexOf('set_draft_id(')>=0){
							if (draft && customcfg.autoCloseOnSave){
								rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.ajax_draft'),[],null);
								rcmail.set_busy(false,'',msgid);
							} else if (draft) {
								rcmail.display_message(ecobj.get_label('ec_plugin.ajax_draft'),"confirmation",2000);
								rcmail.set_busy(false,'',msgid);
								var draftid=data.split('set_draft_id("')[1].split('"')[0];
								if (customcfg.debugEncrypt)log("draft id:",draftid);
								if (components.set_draft_id)components.set_draft_id(draftid);
								else rcmail.set_draft_id(draftid);
								if (components.compose_field_hash)components.compose_field_hash(true);
								else rcmail.compose_field_hash(true);
								if (components.auto_save_start)components.auto_save_start();
								else rcmail.auto_save_start();
							}
						} else {
							rcmail.display_message(ecobj.get_label('ec_plugin.ajax_nosent'),"confirmation",2000);
							rcmail.set_busy(false,'',msgid);
						}
						
						return;
					}
					
					if (data && data.indexOf('remove_compose_data("'+options.formid+'")')>=0){
						if (!draft) rcmail.remove_compose_data(options.formid);
						else {
							
						}
						if (initCompose){
							prepareInitCompose(function(formaction, formdata){
								$.ajax({
									type: "POST",	url: formaction,	data:formdata,
									success: function(data){
										rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.ajax_sent'),[],null);
									}
								});
							});
						}
						else {
							if (!draft) rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.ajax_sent'),[],null);
							else {
								rcmail.display_message(ecobj.get_label('ec_plugin.ajax_draft'),"confirmation",2000);
								rcmail.set_busy(false,'',msgid);
							}
						}
					} else {
						//possible internal error
						rcmail.sent_successfully("confirmation",ecobj.get_label('ec_plugin.ajax_nosent'),[],null);
					}
				}
	        });
		}
	} else {
		rcmail.submit_messageform(draft);
		setTimeout(function(){
			components.unlockSubmitForm();
		},1000);
	}
}

function sendFromQueue(o,h){
	var lid=null;
	if (ECClientCFG.notifySendingQueue) lid=rcmail.display_message(ecobj.get_label('ec_plugin.queue_sending'), 'loading');
	var ignorestrict=false;
	if (o.d.indexOf('ignorestrict=1')>=0)ignorestrict=true;
	var x=getComposeId(function(composeid){
		x=$.ajax({
			type: "POST",	url: o.a,
			data:o.d.replace('_id='+ECClientCFG.customid,'_id='+composeid).replace('_token='+ECClientCFG.customtoken,'_token='+rcmail.env.request_token),
			success: function(data){
				if (lid)rcmail.hide_message(lid); 
				if (ECClientCFG.notifySentQueue) {
					showAlert(ecobj.get_label('ec_plugin.queue_sent'), 3000, 'confirmation');
				}
				if (rcmail.env.action=='' || rcmail.env.action=='list'){
					rcmail.command('checkmail');
					setTimeout(function(){
						rcmail.list_mailbox();
					},500);
				}
				if(h)h(o);
			}
		});
	}, o.a, ignorestrict);
	return function(){
		rcmail.hide_message(lid);
		x.abort();
	};
}
function getKeyHandler(){return ecc.getKeyHandler();}
function setKeyHandler(keys, notime){return ecc.setKeyHandler(keys, notime);}
function checkEncDec(h){
	var u=rcmail.env.ec_identities[0].email;
	if (!u)return;
	encryptContent('testenc',
			function(r){
				decryptVal(r,null,function(r){
					h(true);
				},function(r){
					h(false);
				},null,null,false,true,undefined,true);
			},
			null,[u],u,false,
			function(e){
				h(false);
			},undefined,true
	);
}

var __encryptContentState={encrypting:false, queue:[], resetTime:0};
function pushEncryptContentQueue(p){
	__encryptContentState.queue.push(p);
}
function nextEncryptContentQueue(){
	__encryptContentState.encrypting=false;
	setTimeout(function(){
		if (__encryptContentState.queue.length>0){
			var p=__encryptContentState.queue.shift();
			encryptContent(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7]);
		}
	}, __encryptContentState.resetTime);
}

//encryptContent(String content, Function output, Bool binary, Array users, String sender, Bool enablelog, Function errorh, Bool nocache)
function encryptContent(content, output, binary, users, sender, enablelog, errorh, nocache, systemcall){
	var p=[content, output, binary, users, sender, enablelog, errorh, nocache];
	if (__encryptContentState.encrypting && !systemcall){
		pushEncryptContentQueue(p);
		return;
	} else {
		if (!systemcall)__encryptContentState.encrypting=true;
		initPKD();
		if (!ECClientCFG.keyCache) nocache=true;
		if (!ECClientCFG.debugEncrypt)enablelog=false;
		var encryptParams = {
			sender: sender || rcmail.env.ec_identities[0].email || rcmail.env.identities[rcmail.env.identity].email,
			recipients: users || generateEncryptUsers(true),
			body: content,
			binary: binary,
			getKeyHandler:!nocache ? getKeyHandler : null,setKeyHandler:!nocache ? setKeyHandler : null
		};
		if (encryptParams.recipients){
			encryptParams.recipients=extractEmails(encryptParams.recipients.join(','),false);
		}

		pkd.encrypt(encryptParams).then(function (result) {
			if (!systemcall)nextEncryptContentQueue();
			if (ECClientCFG.removePGPComment && !binary){
				result=result.replace('Comment: http://openpgpjs.org\r\n',ECClientCFG.pgpCommentReplace ? 'Comment: '+ECClientCFG.pgpCommentReplace+'\r\n' : '');
			}
			if (enablelog) log('encryptContent',result);
			
			output(result, binary, encryptParams.recipients, encryptParams.sender);

		}).catch(function (error) {
			var keyerrorstatus=false;
			if (!systemcall){
				keyerrorstatus=processKeyError(error, function(){
					__encryptContentState.encrypting=false;
					initPKD(true);
					setTimeout(function(){
						encryptContent(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7]);
					},0); 
				});
			}
			if (keyerrorstatus){
				
			} else {
				if (!systemcall)nextEncryptContentQueue();
				if (enablelog) log('eventBeforeSend',error);
				if (errorh) errorh(error);
			}
		});
	}
}

var __decryptContentState={decrypting:false, queue:[], resetTime:0};
function pushDecryptContentQueue(p){
	__decryptContentState.queue.push(p);
}
function nextDecryptContentQueue(){
	__decryptContentState.decrypting=false;
	setTimeout(function(){
		if (__decryptContentState.queue.length>0){
			var p=__decryptContentState.queue.shift();
			decryptVal(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8]);
		}
	}, __decryptContentState.resetTime);
}

//decryptVal(String email, Object data, Function completeH, Function errorH, Bool bin, String format, Bool enablelog, Bool nocache, Bool errorCompleteOrigin)
function decryptVal(email, data, completeH, errorH, bin, format, enablelog, nocache, errorCompleteOrigin, systemcall) {
	var p=[email, data, completeH, errorH, bin, format, enablelog, nocache, errorCompleteOrigin];
	if (__decryptContentState.decrypting && !systemcall){
		pushDecryptContentQueue(p);
		return;
	} else {
		if (!systemcall)__encryptContentState.decrypting=true;
		initPKD();
		if (!ECClientCFG.keyCache) nocache=true;
		if (!ECClientCFG.debugDecrypt)enablelog=false;
		if (enablelog){
			log('decryptVal_input');
			log(email && email.length<10000 ? email : 'email too long');
		}
		
		pkd.decrypt({
				body: email, binary:bin, format:format,
				getKeyHandler:!nocache ? getKeyHandler : null,setKeyHandler:!nocache ? setKeyHandler : null
			}).then(function (result) {
				nextDecryptContentQueue();
			if (enablelog){
				log('decryptVal');
				log(result);
			}
			completeH(result, data);
		}).catch(function (error) {
			var keyerrorstatus=false;
			if (!systemcall){
				keyerrorstatus=processKeyError(error, function(){
					__decryptContentState.decrypting=false;
					initPKD(true);
					setTimeout(function(){
						decryptVal(p[0],p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8]);
					},0); 
				});
			}
			if (keyerrorstatus){
				
			} else {
				if (!systemcall)nextDecryptContentQueue();
				if (enablelog) log('decryptVal', 'error',error);
				if (errorH) errorH(error);
				if (errorCompleteOrigin) completeH(email, data, true);
			}
			
		});
	}
}
function processKeyError(error, handler){
	if (rcmail.is_framed()){
		return parent.processKeyError(error, handler);
	}
	if (error.toString().indexOf('Private key is not decrypted')>=0){
		if (ECClientCFG.decryptErrors>0){
			ECClientCFG.decryptErrors--;
			ecc.setPassphrase('');
			ecc.setKeyHandler('', true);
			new requestKeyStatus().clearKeyCache();
			ecc.lockScreen(null, handler);
			return true;
		}
	}
	return false;
}

/*
 * DIALOGS
 */
var ___confirm=window.confirm;
function _confirm(msg,method,args){
	if (msg==ecobj.get_label('notsentwarning')){
		if (!method || (!hasSubject() && !hasContent() && !hasAttachments() && !rcmail.env.compose_mode)){
			return true;
		}
		var dialog=getConfirmDialogHtml('nosent-dialog',msg,ecobj.get_label('ec_plugin.nosent_title'));
		var btns={};
		btns[ecobj.get_label('ec_plugin.nosent_discard')]=function() {
			method.apply(null,args);
			$( this ).dialog( "close" );
		};
		btns[ecobj.get_label('ec_plugin.nosent_save')]=function() {
			$( this ).dialog( "close" );
			ECClientCFG.autoCloseOnSave=true;
			ECClientCFG.queueDrafts=true;
			ECClientCFG.localQueue=false;
			rcmail.command('savedraft');
		};
		btns[ecobj.get_label('ec_plugin.nosent_cancel')]=function() {
			$( this ).dialog( "close" );
		};
		dialog.dialog({
			resizable: false,
			height: "auto",
			width: 400,
			modal: true,
			close:function(){
				dialog.remove();
			},
			buttons: btns
		});
		
		return false;
	}
	
	return ___confirm(msg);
}
confirm=_confirm;

function showAlert(msg, time, type){
	var rid = rcmail.display_message(msg, type || 'loading');
	setTimeout(function(){
		rcmail.hide_message(rid, type || 'loading');
	}, time);
}
function showTitleInput(handler, input_subject){
	if (!input_subject)input_subject=$('#compose-subject');
	var buttons = {},
    myprompt = $('<div class="prompt">').html('<div class="message">' + 
    		ecobj.get_label('nosubjectwarning') + '</div>')
            .appendTo(document.body),
        prompt_value = $('<input>').attr({type: 'text', size: 30}).val(ecobj.get_label('nosubject'))
            .appendTo(myprompt),
        save_func = function () {
            input_subject.val(prompt_value.val());
            myprompt.dialog('close');
            handler();
        };

    buttons[ecobj.get_label('sendmessage')] = function () {
        save_func($(this));
    };
    buttons[ecobj.get_label('cancel')] = function () {
        input_subject.focus();
        $(this).dialog('close');
    };

    myprompt.dialog({
        modal: true,
        resizable: false,
        buttons: buttons,
        close: function (event, ui) {
            $(this).remove();
        }
    });

    prompt_value.select().keydown(function (e) {
        if (e.which == 13) save_func();
    });
}

/*
 * UTILS
 */

//extractEmails(String val, Boolean names=undefined, Array filter=null) : Array 
//names depends on ECClientCFG.supportNotations, internal validation wheter it is or not an email using rcube_check_email
function extractEmails(val, names, filter, format){
	var emails=[];
	if (!names && names!==false && ECClientCFG.supportNotations)names=true;
	if (val){
		var spl=val.split(',');
		emails.initCount=0;
		for(var i=0;i<spl.length;i++){
			var e=spl[i];
			var n="";
			if (!e.replace(regWS,''))continue;
			emails.initCount++;
			if (e.indexOf('<')>=0){
				var ee=e.split('<');
				n=ee[0];
				e=ee[1].split('>')[0];
			}
			e=e.split(' ').join('');
			if (e && rcube_check_email(e)){
				if (filter && filter.indexOf(e)>=0)continue;
				if (!format)emails.push(names && n.split(' ').join('').length>0 ? spl[i] : e);
				else if (format==1){
					emails.push(names && n.split(' ').join('').length>0 ? n+'('+e.split('@')[1]+')' : e);
				} else if (format==2){
					emails.push([n,e]);
				} else if (format==3){
					emails.push([names && n.split(' ').join('').length>0 ? n+'('+e.split('@')[1]+')' : e, e]);
				}
			}
		}
	}
	
	return emails;
}
//requestSource(ECClientCFG customcfg, Object comp) : void
//async function, manages source raw data, if cached and ECClientCFG.emailCache => ecc.getEmailCache, otherwise request from rcmail.env.ec_source or ajax it
function requestSource(customcfg, comp){
	if (!customcfg)customcfg=ECClientCFG;
	if (!comp)comp={};
	var env=comp.env || rcmail.env;
	if (customcfg.emailCache && !env.ec_source) {
		env.ec_source=ecc.getEmailCache(env.uid);
	}
	if (env.ec_source){
		customcfg.requestingSource=true;
		setTimeout(function(){
			customcfg.requestingSource=false;
			if (customcfg.debugDecrypt)log('requestSource','embed source');
			if (customcfg.debugDecrypt)log(env.ec_source && env.ec_source.length<10000 ? env.ec_source : 'email too long to output');
			try {
				customcfg.source=atob(env.ec_source);
			} catch(e){
				customcfg.source=env.ec_source;
			}
			while(true){
				try {
					var news=atob(customcfg.source);
					customcfg.source=news;
				} catch(e){
					break;
				}
			}
			readSourceBody(customcfg, comp);
			if (customcfg.waitForSource || env.compose_mode){
				startDecrypt(customcfg, comp);
			}
		},0);
	} else if (env.uid && env.mailbox){
		customcfg.requestingSource=true;
		$.ajax({
			url:'/?_task=mail&_uid='+env.uid+'&_mbox='+env.mailbox+'&_action=viewsource&_extwin=1',
			complete:function(r){
				customcfg.requestingSource=false;
				if (customcfg.debugDecrypt)log('requestSource');
				if (customcfg.debugDecrypt)log(r.responseText);
				customcfg.source=r.responseText;
				readSourceBody(customcfg, comp);
				if (customcfg.waitForSource || env.compose_mode){
					startDecrypt(customcfg, comp);
				}
			}
		});
	}
}
//decryptEmailMixed(String mode, Object Options=null, ECClientCFG customcfg, Object comp) : void
//mode = input,html | options = null,{}
//various checks, configures all decryption and formatting parameters in advance, decides whether or not will request source or decrypt using other methods
//cleans/shows notifications/messages
function decryptEmailMixed(mode, options, customcfg, comp) {
	if (!customcfg)customcfg=ECClientCFG;
	if (!comp)comp={};
	customcfg.decryptMode=mode;
	customcfg.decryptOptions=options;
	ecobj.clearAllNotifcations({loading:true},true);
	
	if (isPassphraseVisible()){
		__pkd_popup_continue_handler=function(){
			initPKD(true);
			decryptEmailMixed(mode, options, customcfg, comp);
		};
		if (rcmail.is_framed()){
			parent.__pkd_popup_continue_handler=__pkd_popup_continue_handler;
			__pkd_popup_continue_handler=null;
		}
		return;
	}
	initContacts();
	if (rcmail.env.compose_mode && rcmail.env.pgp_mime_message){
		rcmail.env.uid=rcmail.env.pgp_mime_message._uid;
		rcmail.env.mailbox=rcmail.env.pgp_mime_message._mbox;
	}
	
	if (rcmail.env.optional_format=='html' || (rcmail.env.compose_mode && !customcfg.htmlEdit)){
		customcfg.htmlFormat=false;
	}
	if (rcmail.env.compose_mode && rcmail.env.ec_is_encrypted && rcmail.env.ec_source) {
		$('#attachment-list').empty();
		requestSource(customcfg, comp);
	}
	else if (rcmail.env.compose_mode && (!rcmail.env.pgp_mime_message)) {
		customcfg.useReplyFormat=false;
		customcfg.htmlEdit=false;
		customcfg.htmlFormat=false;
		customcfg.noDecrypt=true;
		if (rcmail.env.ec_source){
			$('#attachment-list').empty();
			requestSource(customcfg, comp);
			customcfg.decryptAttachmentsOnly=true;
		} else {
			customcfg.timeoutDecrypt=true;
		}
	}
	else if (rcmail.env.pgp_mime_message || rcmail.env.ec_is_encrypted!==false || rcmail.env.ec_source || ecc.isEmailCached(rcmail.env.uid)){
		$('#attachment-list').empty();
		requestSource(customcfg, comp);
	}
	else {
		customcfg.timeoutDecrypt=true;
		customcfg.emailEncrypted=false;
		customcfg.noDecrypt=true;
		customcfg.useReplyFormat=false;
		customcfg.htmlEdit=false;
		customcfg.htmlFormat=false;
	}
	rcmail.clear_messages();
	showDecryptLoading();
	if (customcfg.timeoutDecrypt){
		setTimeout(function () {
			startDecrypt(customcfg, comp);
		}, customcfg.decryptTimeout);
	}
	else {
		customcfg.waitForSource=true;
	}
	
	if (customcfg.htmlEdit && rcmail.env.compose_mode){
		$("#composebody").val('');
		changeEditor(true);
	}
}
//showDecryptLoading() : void
function showDecryptLoading(){
	rcmail.clear_messages();
	if (ECClientCFG.decryptMessageId)rcmail.hide_message(ECClientCFG.decryptMessageId);
	var id;
	if (!ECClientCFG.noDecrypt) id = rcmail.display_message(ECClientCFG.msgFormat.decrypt, 'loading');
	else id = rcmail.display_message(ECClientCFG.msgFormat.loading, 'loading', 2000);
	ECClientCFG.decryptMessageId=id;
}
//readSourceBody(ECClientCFG cunstomcfg, Object comp) : void
//autocache if enabled, parses entire email including headers, creates structure in ECClientCFG
function readSourceBody(customcfg, comp){
	if (!customcfg)customcfg=ECClientCFG;
	if (!comp)comp={};
	var env=comp.env || rcmail.env;
	if (customcfg.emailCache && customcfg.source && env.mailbox.toLowerCase()=='inbox'){
		ecc.setEmailCache(customcfg.source, env.uid);
	}
	customcfg.source=fromNL(customcfg.source);
	customcfg.sourceindex=customcfg.source.indexOf('\n\n');
	customcfg.sourceHeaders=customcfg.source.substr(0,customcfg.sourceindex);
	customcfg.sourceBody=customcfg.source.substr(customcfg.sourceindex+2);
	customcfg.emailHeaders=extractHeaders(customcfg.sourceHeaders.split(regNL));
	customcfg.emailContentHeader=customcfg.emailHeaders[getNextContentHeaderIndex(customcfg.emailHeaders,0)];
	customcfg.emailContentEncHeader=getHeaderByType(customcfg.emailHeaders, 'Content-Transfer-Encoding');
	customcfg.emailEncrypted=false;
	if (customcfg.emailContentHeader){
		customcfg.emailProtocol=customcfg.emailContentHeader.params.protocol ? customcfg.emailContentHeader.params.protocol.toLowerCase() : null;
		if (!customcfg.emailProtocol)customcfg.emailProtocol=customcfg.emailContentHeader.params[''].toLowerCase();
		if (customcfg.encryptProtocols.indexOf(customcfg.emailProtocol)>=0 || customcfg.encryptProtocols.indexOf(customcfg.emailContentHeader.params[''].toLowerCase())>=0){
			customcfg.emailEncrypted=true;
		}
	}
	customcfg.emailBody=customcfg.emailContentHeader ? customcfg.emailContentHeader.val+NL+NL+customcfg.sourceBody : ""; 
	customcfg.toRecipients=getHeaderByType(customcfg.emailHeaders, 'to');
	customcfg.toRecipients=customcfg.toRecipients ? extractEmails(decodeMixedHeaderVal(customcfg.toRecipients.paramsVal)) : null;
	customcfg.ccRecipients=getHeaderByType(customcfg.emailHeaders, 'cc');
	customcfg.ccRecipients=customcfg.ccRecipients ? extractEmails(decodeMixedHeaderVal(customcfg.ccRecipients.paramsVal)) : null;
	customcfg.bccRecipients=getHeaderByType(customcfg.emailHeaders, 'bcc');
	customcfg.bccRecipients=customcfg.bccRecipients ? extractEmails(decodeMixedHeaderVal(customcfg.bccRecipients.paramsVal)) : null;
	customcfg.fromRecipients=getHeaderByType(customcfg.emailHeaders, 'from');
	customcfg.fromRecipients=customcfg.fromRecipients ? extractEmails(decodeMixedHeaderVal(customcfg.fromRecipients.paramsVal)) : null;
}
//startDecrypt(ECClientCFG customcfg, Object comp) : void
//async function, waits for various conditions - html-editor/source load
//decision making upon final decryption - structured source or default content
//configures all possible parameters for direct decryption based on decided content, extracts mime parts
function startDecrypt(customcfg, comp){
	if (!customcfg)customcfg=ECClientCFG;
	if (!comp)comp={};
	if (!comp.isHtmlEditorSelect)comp.isHtmlEditorSelect=isHtmlEditorSelect;
	if (!comp.isHtmlEditor)comp.isHtmlEditor=isHtmlEditor;
	if (!comp.buildRecipients)comp.buildRecipients=buildRecipients;
	if (!comp.setSubject)comp.setSubject=function(v){$('.subject').text(v);};
	if (!comp.setInputSubject)comp.setInputSubject=function(v){};
	if (!comp.noDecryptPreformat)comp.noDecryptPreformat=function(){
		if (mode=='html'){
			if ($('#attachment-list li').length==0){
				$('.rightcol').hide();
				$('.leftcol').addClass('norightmargin');
			}
			else $('.rightcol').show();
		}
		else {
			$('.rightcol').show();
		}
		rcmail.hide_message(id, 'loading');
	};
	if (!comp.decryptErrorPreformat)comp.decryptErrorPreformat=function(){
		rcmail.hide_message(id, 'loading');
		rcmail.display_message(ecobj.get_label('ec_plugin.decrypt_error'), 'confirmation');
		if (!mode || mode == 'input') {
			$('#composebody').removeClass('hidden').addClass('visible');
		}
		else if (mode == 'html') {
			$('#messagebody').removeClass('hidden').addClass('visible');
		}
	};
	if (!comp.getHtmlEditor)comp.getHtmlEditor=getHtmlEditor;
	if (!comp.finalInputPreformat)comp.finalInputPreformat=function(){
		$('#composebody').removeClass('hidden').addClass('visible');
		$("#composebody").focus();
	};
	
	var env=comp.env || rcmail.env;
	
	var mode=customcfg.decryptMode;
	if (mode=='input' && comp.isHtmlEditorSelect() && !comp.isHtmlEditor()){
		setTimeout(function () {
			startDecrypt(customcfg, comp);
		}, customcfg.decryptTimeout);
		return;
	}
	
	var id=customcfg.decryptMessageId;
	var options=customcfg.decryptOptions;
	var email = customcfg.emailBody;
	var fromSource=true;
	var mimeIsHtml=false;
	
	//email content and parameters
	if (email && !customcfg.decryptAttachmentsOnly){
		if (!customcfg.emailEncrypted && !isPGPTxt(email) && customcfg.useDefaultNonDecrypt && mode=='html'){
			customcfg.noDecrypt=true;
			if (!customcfg.alwaysUseSource){
				customcfg.htmlFormat=false;
				if (customcfg.emailContentHeader && customcfg.emailContentHeader.params['']=='text/plain')mimeIsHtml=false;
				else if(customcfg.emailContentHeader && customcfg.emailContentHeader.params['']=='text/html')mimeIsHtml=true;
				else mimeIsHtml=rcmail.env.optional_format!='html';
				email=null;
			}
		}
	}
	if (!email && !customcfg.requestingSource){
		var defData=getDefaultContent(mode);
		fromSource=false;
		email=defData.txt;
		if (!email && customcfg.emailBody && customcfg.fractalDecryption){
			email=customcfg.emailBody;
			mimeIsHtml=false;
			customcfg.noDecrypt=false;
			customcfg.emailEncrypted=true;
			customcfg.htmlFormat=true;
		} else if (defData.decrypt){
			mimeIsHtml=true;
			customcfg.noDecrypt=false;
			customcfg.emailEncrypted=true;
			if (customcfg.enforceHTMLParams)customcfg.htmlFormat=true;
		}
	}
	if (customcfg.debugDecrypt)log('startDecrypt')
	if (customcfg.debugDecrypt)log(email && email.length<10000 ? email : 'email too long to output');
	if (!email && !customcfg.source){
		customcfg.waitForSource=true;
		return;
	}
	if (mode=='input' && fromSource){
		customcfg.htmlFormat=true;
		customcfg.useReplyFormat=true;
		customcfg.htmlEdit=true;
	}
	
	//mime parts
	var mimeParts = customcfg.noDecrypt && !customcfg.decryptAttachmentsOnly && !fromSource ? null : extractMimeParts(email);
	if (customcfg.debugDecrypt)log('startDecrypt',mimeParts);
	if (customcfg.mime.keepMimeParts) customcfg.mime.mimeParts=mimeParts;
	var mimeContent=customcfg.noDecrypt && !mimeParts && !fromSource ? null : getMimeContent(mimeParts, mode, customcfg.emailContentEncHeader, customcfg.emailContentHeader);
	var originalMimeParts=mimeParts;
	
	//decrypt content
	var emailToDecrypt='';
	if (!customcfg.decryptAttachmentsOnly || (customcfg.alwaysUseSource && fromSource))emailToDecrypt=email;
	else {
		emailToDecrypt=getDefaultContent(mode).txt;
		fromSource=false;
	}
	
	if (mimeContent && mimeContent.content){
		emailToDecrypt=mimeContent.content;
		mimeIsHtml=mimeContent.type=='text/html';
		if ((mode=='input' && customcfg.htmlEdit || mode=='html') && customcfg.htmlFormat && (mimeContent.type=='text/plain' || mimeContent.type=='application/octet-stream')){
			emailToDecrypt=emailToDecrypt.split('\n').join('<br>');
			if (isPGPTxt(emailToDecrypt)){
				mimeIsHtml=true;
				customcfg.noDecrypt=false;
			}
		}
	}
	var omimeIsHtml=mimeIsHtml;
	
	var decrypt = customcfg.noDecrypt ? null : filterDecryptContent(emailToDecrypt, mimeIsHtml,mode);
	var toDecrypt = decrypt ? decrypt.di.length : 0;
	
	comp.buildRecipients();//depends on previous parameters and syncing all methods to be executed at once
	var subjh=getHeaderByType(customcfg.emailHeaders, 'Subject');
	if (customcfg.enforceHeaderSubject){
		var subjv=decodeMixedHeaderVal(subjh.paramsVal);
		if (subjh && mode=='html') comp.setSubject(subjv);
		else if (subjh && mode=='input') comp.setInputSubject(subjv);
	}
	
	function finalInput(finalVal) {
		comp.finalInputPreformat();
		
		if (customcfg.useReplyFormat && env.compose_mode!='draft' && env.compose_mode!='edit'){
			var fromH=getHeaderByType(customcfg.emailHeaders, 'from');
			var dateH=getHeaderByType(customcfg.emailHeaders, 'date');
			var d=dateH ? new Date(dateH.paramsVal) : new Date();
			var inputReplyText='';
			if (dateH){
				inputReplyText=customcfg.replyFormat.replace('%YY%', d.getFullYear()).
				replace('%MM%', toZeroString(d.getMonth()+1, 2)).
				replace('%DD%', toZeroString(d.getDate(), 2)).
				replace('%h%', toZeroString(d.getHours(), 2)).
				replace('%m%', toZeroString(d.getMinutes(), 2)).
				replace('%FROM%', decodeMixedHeaderVal(fromH.paramsVal));
			} else {
				inputReplyText=customcfg.replyFormatNoDate.replace('%FROM%', decodeMixedHeaderVal(fromH.paramsVal));
			}
			
			if (comp.isHtmlEditor()){
				finalVal=inputReplyText+'<br>'+quoteContent(finalVal, true);
			}
			else {
				finalVal=inputReplyText+NL+quoteContent(finalVal);
			}
		}
		
		if (comp.isHtmlEditor()){
			setTimeout(function(){ 
				if (env.compose_mode=='draft' || env.compose_mode=='edit') comp.getHtmlEditor().setContent(finalVal);
				else if (customcfg.replyOnTop) {
					comp.getHtmlEditor().setContent('<div id="cursormarker"></div><br><br>'+finalVal);
					var placeholderMarker = $(comp.getHtmlEditor().getBody()).find('#cursormarker');
					comp.getHtmlEditor().selection.select(placeholderMarker.get(0) );
					placeholderMarker.remove();
				}
				else {
					comp.getHtmlEditor().setContent(finalVal+'<br><br>');
				}
				comp.getHtmlEditor().focus();
				$(comp.getHtmlEditor().getBody()).animate({ scrollTop: 0 }, { duration: 50 });
			},500);
		}
		else {
			if (env.compose_mode=='draft' || env.compose_mode=='edit') $("#composebody").val(finalVal);
			else if (customcfg.replyOnTop) {
				$("#composebody").val(NL+NL + finalVal);
				$("#composebody").get(0).setSelectionRange(0, 0);
			}
			else {
				$("#composebody").val(finalVal + NL+NL);
				$("#composebody").get(0).setSelectionRange(finalVal.length + 2, finalVal.length + 2);
			}
		}
	}

	function completeH(result, index, notdecrypted) {
		toDecrypt--;
		decrypt.val[index] = result;
		
		if (notdecrypted){
			if (decrypt.di.indexOf(index)>=0)decrypt.di.splice(decrypt.di.indexOf(index),1);
			if (decrypt.oval[index]) decrypt.val[index]=decrypt.oval[index];
		}
		if (toDecrypt == 0) {
			rcmail.hide_message(id, 'loading');
			
			var mimeParts=null;
			var mimeContent=null;
			var mimeIsHtml=false;
			var finalVal='';
			var i;
			var skipMimeExtract=false;
			var finalMimeParts=null;
			var requireStackHeaders=false;
			
			if (customcfg.debugDecrypt) log('final decrypt',decrypt);
			
			if (customcfg.enableDecryptRevert && decrypt.di.length==0){
				finalVal=emailToDecrypt;
				mimeIsHtml=omimeIsHtml;
				decrypt=null;
				if (!mode || mode == 'input') {
					if (!mimeIsHtml && customcfg.htmlFormat){ finalVal = htmlWS(finalVal); }
				} else {
					if (!mimeIsHtml){ finalVal = htmlWS(finalVal); }
				}
			} else if (customcfg.fractalDecryption && !customcfg.nonblockingPGP && decrypt.fractalized){
				//implement multiple/indepth pgp and concat data
			} else {
				if (decrypt.nonblocking) finalVal=decrypt.val.join('\n');
				else {
					if (!customcfg.stackDecrypt && decrypt.di.length>0){
						for(i=0;i<decrypt.di.length;i++){
							finalVal+=(i==0 ? '' : '\n\n')+decrypt.val[decrypt.di[i]];
						}
					} else {
						skipMimeExtract=true;
						if (decrypt.di.length>0){
							for(i=0;i<decrypt.val.length;i++){
								var ddata=decrypt.val[i];
								var fdata=testDisplayTxt(ddata);
								if (fdata && decrypt.di.indexOf(i)<0){
									requireStackHeaders=true;
									break;
								}
							}
						}
						
						var lastval=null;
						for(i=0;i<decrypt.val.length;i++){
							var ddata=decrypt.val[i];
							if (!ddata)continue;
							var fdata=testDisplayTxt(ddata);
							
							if (fdata){
								mimeParts=null;
								if (decrypt.di.indexOf(i)>=0){
									mimeParts = extractMimeParts(ddata);
									if (customcfg.debugDecrypt)log('startDecrypt','decrypt',mimeParts);
									if (customcfg.mime.keepMimePartsDecrypt) customcfg.mime.mimePartsDecrypt=mimeParts;
									mimeContent = getMimeContent(mimeParts, mode);
									if (mimeContent && mimeContent.content){
										ddata=mimeContent.content;
										mimeIsHtml=mimeContent.type=='text/html';
									}
								}
								if (customcfg.packDecryptStacks){
									ddata=ddata.split('\r').join('');
									ddata=packString(ddata, true);
								}
								if (customcfg.addDecryptStackHeaders && requireStackHeaders && decrypt.di.indexOf(i)>=0){
									ddata=customcfg.decryptStackHeaders[0]+'\n\n'+ddata+'\n\n'+customcfg.decryptStackHeaders[1];
								}
								if (!mode || mode == 'input') {
									if (!mimeIsHtml && customcfg.htmlFormat){ ddata = htmlWS(ddata); }
								} else {
									if (!mimeIsHtml){ ddata = htmlWS(ddata); }
								}
								var lvsn=lastval ? lastval.split(/<br\s*\/?>/) : [];
								finalVal+=(!testDisplayTxt(lastval) || !testDisplayTxt(lvsn[lvsn.length-1]) ? '' : '<br><br>');
								finalVal+=ddata;
								lastval=ddata;
								finalMimeParts=mergeMimeParts(finalMimeParts, mimeParts);
								
								if (customcfg.debugDecrypt) log('stackDecrypt',ddata)
							} else {
								lastval=ddata;
								finalVal+=ddata;
							}
						}
					}
					
				}
				if (!skipMimeExtract){
					mimeParts = extractMimeParts(finalVal);
					if (customcfg.debugDecrypt)log('startDecrypt','decrypt',mimeParts);
					if (customcfg.mime.keepMimePartsDecrypt) customcfg.mime.mimePartsDecrypt=mimeParts;
					mimeContent = getMimeContent(mimeParts, mode);
					if (mimeContent && mimeContent.content){
						finalVal=mimeContent.content;
						mimeIsHtml=mimeContent.type=='text/html';
					}
					finalMimeParts=mimeParts;
					if (!mode || mode == 'input') {
						if (!mimeIsHtml && customcfg.htmlFormat){ finalVal = htmlWS(finalVal); }
					} else {
						if (!mimeIsHtml){ finalVal = htmlWS(finalVal); }
					}
					
				}
			}
			if (mode=='html')finalMimeParts=mergeMimeParts(finalMimeParts, originalMimeParts, true, true);
			formatDecryptContent(finalVal, mode, mimeIsHtml, finalInput, decrypt, finalMimeParts, fromSource, customcfg, comp);
		}
	}
	
	if (env.compose_mode=='forward' || env.compose_mode=='edit' || env.compose_mode=='draft') addUploadAttachments(mimeParts, customcfg, comp.atList);
	if (toDecrypt == 0) {
		comp.noDecryptPreformat();
		formatDecryptContent(emailToDecrypt, mode, mimeIsHtml, finalInput, null, mimeParts, fromSource, customcfg, comp); 
	}
	else {
		for (var i = 0; i < decrypt.di.length; i++) {
			let index = decrypt.di[i];
			decryptVal(decrypt.val[index], index, completeH, function (err) {
				comp.decryptErrorPreformat();
			},false,null,true,null,true);
		}
	}
	if (customcfg.debugDecrypt)log('startDecrypt',decrypt);
}

//formatLinkifyHtml(String val) : String
function formatLinkifyHtml(val){
	var linkContainer=$('<div></div>');
	if (ECClientCFG.linkifyHtml){
		linkContainer.html(val);
		secureAttributes(linkContainer);
		var newnodes=[];
		depthIterateJChildren(linkContainer,function(t){
			var nodetxt=t[0].textContent;
			var newnode=linkify(nodetxt);
			if (newnode==nodetxt)return;
			var newnodeJ=$('<div></div>');
			newnodeJ.html(newnode);
			newnodes.push([t,newnodeJ]);
		},'a');
		changeNodeList(newnodes);//!!OPTIMIZE
		
		val=linkContainer.html();
	} else if (ECClientCFG.secureAttributes) {
		linkContainer.html(val);
		secureAttributes(linkContainer);
		val=linkContainer.html();
	}
	return val;
}

//addHtmlToMessageBody(String val, addAttachments attachmentsData) : void
function addHtmlToMessageBody(val, attachmentsData){
	var msgbody=$("#messagebody");
	msgbody.html("<div class='pre'><span style='' id='ec-content'>" + val + "</span></div>");
	$('a', msgbody).each(function(){
		$(this).attr('target','_blank');
	});
	if (attachmentsData && attachmentsData.html.length){
		for(var i=0;i<attachmentsData.html.length;i++){
			if (attachmentsData.html[i]) {
				msgbody.append(attachmentsData.html[i]);
			}
		}
	}
}

//formatDecryptContent(String val,String mode,Boolean mimeIsHtml,Function finalInput,Object decryptData=null,Object mimeParts=null,ECClientCFG customcfg, Object comp) : void
function formatDecryptContent(val, mode, mimeIsHtml, finalInput, decryptData, mimeParts, fromSource, customcfg, comp){
	if (!customcfg)customcfg=ECClientCFG;
	if (!comp)comp={};
	if (!comp.isHtmlEditor)comp.isHtmlEditor=isHtmlEditor;
	if (!comp.verifyAttachmentUpload)comp.verifyAttachmentUpload=verifyAttachmentUpload;
	if (!comp.inputAfterFormat)comp.inputAfterFormat=function(){
		$('.rightcol').show();
	};
	
	var env=comp.env || rcmail.env;
	
	if (!mode || mode == 'input') {
		if (comp.isHtmlEditor() && (decryptData || fromSource) && customcfg.autoSecureEncImgs){
			val=secureImgs(val, mimeParts, mode, customcfg, comp);
		}
		comp.verifyAttachmentUpload(mode, mimeParts);
		if (env.compose_mode=='forward' || env.compose_mode=='edit' || env.compose_mode=='draft') addUploadAttachments(mimeParts, customcfg, comp.atList);
		if (customcfg.secureAttributes && comp.isHtmlEditor()){
			var jD=$('<div>');
			jD.append(val);
			secureAttributes(jD);
			val=jD.html();
		}
		finalInput(val);
		comp.inputAfterFormat();
	}
	else if (mode == 'html') {
		$('#messagebody').removeClass('hidden').addClass('visible');
		if (customcfg.noDecrypt){
			if (fromSource){
				if (!isSafeMode() && customcfg.autoSecureEncImgs){
					val=secureImgs(val, mimeParts, mode);
				}
				verifyAttachmentDownload(mode, mimeParts);
				var attachmentsData=null;
				try{
					if (mimeParts && mimeParts.content && mimeParts.content.attachments){
						attachmentsData=addAttachments(mimeParts);
					}
					if ($('#attachment-list li').length==0){
						$('.rightcol').hide();
						$('.leftcol').addClass('norightmargin');
					} else $('.rightcol').show();
				} catch(e){
					if (customcfg.debugDecrypt)log(e);
				}
				
				val=formatLinkifyHtml(val);
				addHtmlToMessageBody(val, attachmentsData);
			}
		}
		else {
			if (customcfg.useEncIcon) $('.subject').prepend('<img class="enc-img" src="/skins/outlook/skin/images/ec_crypt_icon.png"/>');
			if (customcfg.useEncLine){
				$(rcmail.env.action=='show' ? '#messagecontent' : '#messagepreview').prepend('<div class="ec_green_line">'+rcmail.get_label('ec_plugin.green_line_msg')+'</div>');
				$(rcmail.env.action=='show' ? '#mainscreencontent' : 'body').addClass('ec_encrypt_body');
			}
			new FloatingTooltip($('.subject .enc-img'), rcmail.get_label('ec_plugin.tooltip_encbtn'), true);
			
			if (decryptData && !isSafeMode() && customcfg.autoSecureEncImgs){
				val=secureImgs(val, mimeParts, mode);
			}
			if (decryptData){
				verifyAttachmentDownload(mode, mimeParts);
			}
			var attachmentsData=null;
			try{
				if (decryptData && mimeParts && mimeParts.content && mimeParts.content.attachments){
					attachmentsData=addAttachments(mimeParts);
				}
				if ($('#attachment-list li').length==0){
					$('.rightcol').hide();
					$('.leftcol').addClass('norightmargin');
				} else $('.rightcol').show();
			} catch(e){
				if (customcfg.debugDecrypt)log(e);
			}
			
			val=formatLinkifyHtml(val);
			addHtmlToMessageBody(val, attachmentsData);
		}
		if ($('.rightcol').css('display')!='none'){
			$('.leftcol').css({'min-height':$('.rightcol').outerHeight()});
		}
	}
}

/*
 * CONTENT EDITOR
 */

function getDefaultContent(mode) {
	var email=null;
	var decrypt=false;
	if (!mode || mode == 'input') {
		email = $("#composebody").val();
	}
	else if (mode == 'html') {
		if ($('#message-part1').length>0){
			email = $("#message-part1").html();
		}
		else {
			email = $("#message-htmlpart1").html();
		}
	}
	if (isPGPTxt(email)) decrypt=true;
	
	return {txt:email, decrypt:decrypt};
}

function secureImgs(html, mimeParts, mode, customcfg, comp){
	if (!customcfg)customcfg=ECClientCFG;
	if (!comp)comp={};
	if (!comp.activateSafeMode)comp.activateSafeMode=function(){
		$('#remote-objects-message').show();
		$('#remote-objects-message a').click(function(){
			unsecureImgs();
			return false;
		});
	};
	
	var imgs=[];
	var embedImgs=[];
	var jD=$('<div>');
	jD.append(html);
	$('img', jD).each(function(){
		var img=$(this);
		var src=img.attr('src');
		var srcset=img.attr('srcset');
		var host=window.location.hostname;
		if (src.toLowerCase().indexOf('cid:')==0){
			img.attr('cid',src);
			if (mimeParts){
				var id='image_<'+src.substr(4)+'>';
				var headers=mimeParts.content[id+'_headers'];
				var ctheader=getHeaderByType(headers,'Content-type');
				src='data:'+(ctheader && ctheader.params ? ctheader.params[''] : '')+';base64,'+mimeParts.content[id].join('');
				img.attr('src',src);
				embedImgs.push(img);
			}
			else {
				imgs.push(img);
				img.addClass(customcfg.blockImgCls);
				src=img.attr('_src');
				img.attr('__src', src);
				img.attr('src', customcfg.blockImgUrl);
			}
		}
		else if ((src.indexOf('http://'+host)!=0 && src.indexOf('https://'+host)!=0) && (src.indexOf('http://')==0 || src.indexOf('https://')==0)){
			imgs.push(img);
			img.addClass(customcfg.blockImgCls);
			img.attr('__src', src);
			if (srcset) img.attr('__srcset', srcset);
			img.attr('src', customcfg.blockImgUrl);
			if (srcset) img.attr('srcset', '');
		}
	});
	if (customcfg.secureIframes) $('iframe',jD).remove(); 
	if (customcfg.secureScripts) $('script',jD).remove();
	if (customcfg.secureVideo) $('video',jD).remove();
	for(var s=0;s<customcfg.secureTags.length;s++){
		$(customcfg.secureTags[s],jD).remove();
	}
	
	if (imgs.length==0 && embedImgs.length==0)return jD.html();
	if (imgs.length>0){
		customcfg.internalSafeMode=true;
		comp.activateSafeMode();
	}
	
	html=jD.html();
	return html;
}
function unsecureImgs(){
	ECClientCFG.internalSafeMode=false;
	$('#remote-objects-message').hide();
	
	$('#messagebody .'+ECClientCFG.blockImgCls).each(function(){
		var img=$(this);
		img.attr('src', img.attr('__src'));
		if (img.attr('__srcset')) img.attr('srcset', img.attr('__srcset'));
	});
}

function isSafeMode() { return rcmail.env.safemode; }
function removeColFromMsgList(col){
	delete rcmail.env.coltypes[col];
	var index=rcmail.env.listcols.indexOf(col);
	if (index>=0)rcmail.env.listcols.splice(index,1);
	return index>=0;
}

/*
 * LIST
 */

function getSortedMessages(selection){
	var sorted_msgs=[];
	if (selection){
		for(var i=0;i<selection.length;i++){
			selection[i]=String(selection[i]);
		}
	}
	$('#messagelist .message').each(function(){
		if ($(this).css('display')=='none')return;
		var id=$(this).attr('id').substr(6);
		
		id=ecc.rcmail.html_identifier_decode(id);
		if (!selection || selection.indexOf(id)>=0){
			sorted_msgs.push(id);
		}	
	});
	return sorted_msgs;
}

/*
 * INIT
 */
function initMail() {
	var keyStatus=new requestKeyStatus();
	var keyVerifyId=ecc.verifyTimeout(function(){
		if (ecc.isLocked())return;
		ecc.setKeyHandler('', true);
		keyStatus.clearKeyCache();
	}, 1000, keyStatus.getKeyCacheExp, null, 
	function(id){
		keyVerifyId=id;
	});
	
	var moremenu=$('#messagemenu-menu');
	if (moremenu.length>0){
		if ($('.download',moremenu).length>0){
			$('.download',moremenu).parent().parent().remove();
		}
		$('.edit',moremenu).html(rcmail.get_label('ec_plugin.moremenu_sendagain'));
		$('.move',moremenu).parent().parent().insertBefore($('.edit',moremenu).parent().parent());
		$('.copy',moremenu).parent().parent().insertBefore($('.edit',moremenu).parent().parent());
	}
	$('#messagetoolbar').css({visibility:'visible'});
	if (!rcmail.env.action){
		var backbtn=$('<a class="button back" id="rcmbtn105" role="button" tabindex="0" aria-disabled="false" href="./?_task=mail&amp;_action=list" onclick="return rcmail.revertShowMessage()">'+rcmail.get_label('ec_plugin.msgtoolbar_back')+'</a>');
		$('#messagetoolbar').prepend(backbtn);
		backbtn.hide();
	}
}
function initContent() {
	if (ECClientCFG.hideEncryptionBlock) {
		if (rcmail.env.action == 'compose') {
			$('#composebody').addClass('hidden');
		}
		else {
			$('#messagebody').addClass('hidden');
		}
	} else {
		if (rcmail.env.action == 'compose') {
			$('#composebody').addClass('visible');
		}
		else {
			$('#messagebody').addClass('visible');
		}
	}
	if (rcmail.env.action == 'compose') {
		
	}
	else if (rcmail.env.action == 'show') {
		$('#markmessagemenulink').attr('title','');
		new FloatingTooltip('#markmessagemenulink',rcmail.get_label('ec_plugin.tooltip_markbtn'),true);
	} else if (rcmail.env.action == 'preview'){
		setTimeout(function(){
			var t=$('#previewheaderstoggle');
			if (t.attr('aria-expanded')=='false')
				t.click();
			rcmail.http_request('pagenav', {_uid: rcmail.env.uid, _mbox: rcmail.env.mailbox, _search: rcmail.env.search_request});
		},0);
	}
	
	if (rcmail.env.action == 'show' || rcmail.env.action == 'preview') {
		$('#messagetoolbar .print').attr('onclick','').attr('href','').click(function(){
			print();
			return false;
		});
		$('#messagebody').delegate('a','click',function(e){
			var a=$(this);
			var hr=a.attr('href');
			
			if (ECClientCFG.localMailTo && hr.indexOf('mailto:')==0){
				rcmail.command('compose',hr.split('mailto:')[1]);
			} else {
				window.open(hr, '_blank');
			}
			
			return false;
		});
	}
}
function initContacts(){
	if (rcmail.env.action == 'show' || rcmail.env.action == 'preview') {
		var invalidEmails=[];
		var inviteEmailsBtn='<a style="cursor:pointer;" class="rcmaddcontact" id="invitecontactsbtn"><img style="height: 16px; position: absolute; top: -2px;" src="'+location.protocol+'//'+location.host+'/skins/outlook/skin/images/invite_icon3.png" alt="'+ecobj.get_label('ec_plugin.invite_contacts')+'"></a>';
		
		if (ECClientCFG.enableEmailInvite){
			$('.headers-table .rcmaddcontact').remove();
			$('.headers-table .rcmContactAddress').each(function(){
				var t=$(this);
				var e=t.attr('href').split('mailto:')[1];
				var ks=new requestKeyStatus(e, function(e,v){
					t.addClass(v ? 'rcmContactAddressValid' : 'rcmContactAddressInvalid');
					if (!v && invalidEmails.indexOf(e)==-1){
						invalidEmails.push(e);
					}
					if (!v) {
						var inv=$(inviteEmailsBtn);
						var p=parent;
						inv.attr('id','invitecontactsbtn'+rcmail.html_identifier_encode(e));
						t.parent().append(inv);
						inv.click(function(event){
							if (rcmail.is_framed())p.openInvitePopup([e], true);
							else openInvitePopup([e], true);
							return false;
						});
						new FloatingTooltip(inv, rcmail.get_label('ec_plugin.tooltip_invitebtn2'), true);
						inv.css({'display':'inline'});
					}
				},null,null,null,true);
			});
		}
		
		if (ECClientCFG.enableDateInvite){
			 var p=parent;
			 if (ECClientCFG.enableEmailInvite){
			 	var inv=$(inviteEmailsBtn)
			 	$('.headers-table .date').append(inv);
			 	inv.click(function(){
			 		if (rcmail.is_framed())p.openInvitePopup(invalidEmails);
			 		else openInvitePopup(invalidEmails);
			 		return false;
			 	});
			 	new FloatingTooltip(inv, rcmail.get_label('ec_plugin.tooltip_invitebtn2'), true);
			 	inv.css({'display':'inline'});
			 }
		}
		$('#preview-allheaders .date').parent().addClass("previewdatereposition");
	}
}
function configMessageList() {
	$('#mainscreen').addClass('page-list');
	rcmail.message_list.addEventListener('initrow',function(e){
		if (e.ec_encrypted){
			var img='<img class="enc-img" src="/skins/outlook/skin/images/ec_crypt_icon.png"/>';
			var msg=$('#rcmrow'+rcmail.html_identifier_encode(e.uid));
			if ($('.enc-img',msg).length>0){
				
			} else {
				if (ECClientCFG.useEncIconInList) $('.threads',msg).append(img);
				new FloatingTooltip($('.threads .enc-img',msg), rcmail.get_label('ec_plugin.tooltip_encbtn'), true);
			}
		}
		if (!ECClientCFG.enablePriority){
			
		} else {
			$('.status',msg).css({'visibility':'visible'});
		}
		$('.status',msg).css({'pointer-events':'none'})
	});
	rcmail.updateMessageToolbarButtons=function(){
		if (getSortedMessages(rcmail.message_list.get_selection()).length==0){
			$('#messagetoolbar .button').addClass('disabled');
			$('#messagetoolbar .checkmail').removeClass('disabled');
			$('#messagetoolbar .compose').removeClass('disabled');
		} else {
			$('#messagetoolbar .button').removeClass('disabled');
		}
	};
	rcmail.message_list.addEventListener('select',function(e){
		rcmail.updateMessageToolbarButtons();
	});
	rcmail.message_list.addEventListener('renderAfter',function(e){
		rcmail.updateMessageToolbarButtons();
	});
	rcmail.message_list.addEventListener('renderBefore',function(e){
		rcmail.updateMessageToolbarButtons();
	});
	rcmail.message_list.addEventListener('toggle',function(e){
		rcmail.updateMessageToolbarButtons();
	});
	rcmail.addEventListener('listupdate', function (o) {
		ecobj.clearAllNotifcations({loading:true, notice:true,'No_messages_found_in_this_mailbox_':true},true);
		if (o && o.rowcount==0){
			rcmail.display_message(ecobj.get_label('ec_plugin.No_messages_found_in_this_mailbox_'),'notice');
		}
		rcmail.updateMessageToolbarButtons();
    });
	rcmail.addFolderMessagesFromCache(rcmail.env.mailbox);
	if(ECClientCFG.listSelect){
		var msgs=getSortedMessages();
		if (msgs.length>0)rcmail.message_list.select(msgs[0]);
	}
	rcmail.updateMessageToolbarButtons();
	setInterval(function(){
		if (!rcmail.message_list)return;
		var sel=getSortedMessages(rcmail.message_list.get_selection());
		if (sel.length==0){
			rcmail.clear_previewcontent();
			rcmail.stop_previewAnime();
		} else if (!rcmail.get_preview_uid()){
			rcmail.start_previewAnime();
		}
		rcmail.updateMessageToolbarButtons();
	},1000);
	var inboxli=$('#rcmli'+rcmail.html_identifier_encode('INBOX'));
	var outboxli=inboxli.clone(false);
	outboxli.attr('id','rcmli'+rcmail.html_identifier_encode('OUTBOX'))
		.removeClass('inbox selected').addClass('outbox');
	$('a',outboxli).attr('href','').attr('onclick','').attr('rel','OUTBOX')
	.html(ecobj.get_label('ec_plugin.outbox_title')+' <span class="outbox_sent">(<span id="outbox-count">0</span>)</span>').click(function(){
		if (ECClientCFG.queueDialog)
			__queue_reset_content=openQueueDialog();
		return false;
	});
	var outboxafterli=$('#rcmli'+rcmail.html_identifier_encode(ECClientCFG.placeOutboxAfter));
	if (outboxafterli.length==0){
		outboxafterli=$('#mailboxlist li:last');
		outboxafterli.after(outboxli);
	}
	else {
		outboxafterli[ECClientCFG.placeOutboxFunction](outboxli);
	}
	if (!ECClientCFG.queueDialog)outboxli.hide();
	__queueUpdateFunction=fixOutboxCount;
	fixOutboxCount();
	
	function masterSendQueue(){
		return checkMasterQueue(__session_id, 'mail', '', 'masterQ', ECClientCFG.sessionData, function(){
			flashTitle('Queue Focus', 2, 1000);
		});
	}
	function masterFetchQueue(){
		return checkMasterQueue(__session_id, 'mail', '', 'masterF', ECClientCFG.sessionData);
	}
	
	$(window).on('beforeunload',function() {
        if (__queue_stop_method){
        	__queue_stop_method();
        	__queue_stop_method=null;
        	if (__queue_object)onQueueSent(__queue_object);
        	stopQueue();
        	ECClientCFG.autoResumeQueue=false;
            
        	return true;
        }
        return;
    });
	if (ECClientCFG.autoResumeQueue && masterSendQueue()){
		startQueue();
	}
	function onfetch(source, uid){
		if (source && uid){
			if (rcmail.env.messages[uid] && !rcmail.env.messages[uid].ec_encrypted)	ecc.setEmailCache('1', uid,null,null,null,'emailCacheSizeZero');
			else ecc.setEmailCache(source, uid);
		}
		if (checkvalidfetch()){
			ecc.onEmailFetch(onfetch);
		}
	}
	function checkvalidfetch(){
		if (ECClientCFG.autoFetchToCache && rcmail.env.current_page==1 && rcmail.env.mailbox.toLowerCase()=='inbox' && rcmail.env.sort_order=='DESC')return true;
		return false;
	}
	if (ECClientCFG.autoFetchToCache && masterFetchQueue() && checkvalidfetch()){
		ecc.onEmailFetch(onfetch);
	}
	setInterval(function(){
		fixOutboxCount();
		if (!ECClientCFG.lockMode && ECClientCFG.autoResumeQueue && !__queue_started && masterSendQueue()){
			onQueueSent();
		}
		if (!ECClientCFG.lockMode && ECClientCFG.autoFetchToCache && !ecc.fetching && masterFetchQueue() && checkvalidfetch()){
			ecc.onEmailFetch(onfetch);
		}
	}, 1000);
	
	if (!ECClientCFG.enablePriority){
		$('#messagessearchfilter option').each(function(){
			var op=$(this);
			if (op.attr('value').indexOf('X-PRIORITY')>=0){
				op.remove();
			}
		});
		setTimeout(function(){
			var r1=removeColFromMsgList('status')
			var r2=removeColFromMsgList('priority')
			if (r1 || r2){
				rcmail.command('save-pref', {name: 'list_cols', value: rcmail.env.listcols, session: 'list_attrib/columns'});
				rcmail.set_list_options(rcmail.env.listcols);
			}
		},0);
	}
	$('#messagessearchfilter').append('<option value="HEADER Content-Type multipart/encrypted">Encrypted</option>');
	
	$('#mailboxmenulink').attr('onclick','').attr('href','./?_task=settings&_action=folders');
	$('#markmessagemenulink').attr('onclick','').attr('href','').attr('title','').click(function(event){
		var s='read';//'unread'
		if (rcmail.message_list){
			var sel=rcmail.message_list.selection;
			var unread=0;
			for(var i=0;i<sel.length;i++){
				if (rcmail.message_list.rows[sel[i]].unread)unread++;
			}
			if (unread<sel.length)s='unread';
			else s='read';
			return rcmail.command('mark',s,this,event);
		}
	});
	new FloatingTooltip('#markmessagemenulink',rcmail.get_label('ec_plugin.tooltip_markbtn'),true);
	
	$('#messagetoolbar .checkmail').click(function(){
		clearQueueFail();
	});
	
	$('#taskbar .button-mail').remove();
}

function flashTitle(msg, times, interval){
	if (ECClientCFG.disableFlashTitle)return;
	var t=document.title;
	document.title=msg;
	var fl=true;
	var intid=setInterval(function(){
		document.title=fl ? t : msg;
		fl=!fl;
		if (!fl)times--;
		if (times==0)window.clearInterval(intid);
	},interval);
	return intid;
}

/*
 * LOCALSTORAGE
 */
var __tempstorage={};
function clearLocalStorage(){
    var lockkey = "__lock_";
    var store = {};
    var skipparams = ['passphrase_exp'];
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(lockkey) == 0 || skipparams.indexOf(key) >= 0)continue;
        store[key] = true;
    }

    for (var key in store) {
        localStorage.removeItem(key);
    }
};

function LockStorage(mode, handler, ehandler){
	var u=rcmail.env.ec_identities[0].email;
	if (!u)return;
	
	var lockkey="__lock_";
	var store={};
	var skipparams=['passphrase_exp','user_passphrase','keys'];
	for(var i=0;i<localStorage.length;i++){
		var key=localStorage.key(i);
		if (key.indexOf(lockkey)==0 || skipparams.indexOf(key)>=0)continue;
		var data=localStorage.getItem(key);
		store[key]=data;
	}
	__tempstorage=store;
	if (mode==1){
		for(var key in store){
			localStorage.removeItem(key);
		}
	}
	var jsonstore=JSON.stringify(store);
	
	if (!mode || mode==2){
		if (ECClientCFG.overrideLocks || !HasLock()){
			encryptContent(jsonstore,
					function(r){
						for(var key in store){
							localStorage.removeItem(key);
						}
						setClassStorage(lockkey+rcmail.env.user_id, r);
						delete pkd.password;
						if (handler)handler();
					},
					null,[u],u,false,
					function(e){
						for(var key in store){
							localStorage.removeItem(key);
						}
						if (ehandler)ehandler();
					}
			);
		} else {
			if (handler)handler();
		}
	} else if (handler)handler();
}
function UnlockTempStorage(){
	if (__tempstorage){
		for(var key in __tempstorage)setClassStorage(key, __tempstorage[key],undefined,undefined,undefined,true);
	}
}
function UnlockStorage(user_id){
	if (!user_id)user_id=rcmail.env.user_id;
	var lockkey="__lock_";
	var data=localStorage.getItem(lockkey+user_id);
	decryptVal(data,null,function(r){
		var store=JSON.parse(r);
		LockStorage(1);
		localStorage.removeItem(lockkey+user_id);
		for(var key in store){
			setClassStorage(key, store[key]);
		}
	},function(r){
		
	},null,null,false,true);
	ECClientCFG.unlocking=false;
}
function ClearLockStorage(user_id,all){
	if (!user_id)user_id=rcmail.env.user_id;
	var lockkey="__lock_";
	if (all){
		var store={};
		var key;
		for(var i=0;i<localStorage.length;i++){
			key=localStorage.key(i);
			if (key.indexOf(lockkey)==0)store[key]=true;
		}
		for(var key in store){
			localStorage.removeItem(key);
		}
	}
	else localStorage.removeItem(lockkey+user_id);
}
function HasLock(user_id){
	if (!user_id)user_id=rcmail.env.user_id;
	var lockkey="__lock_";
	var data=localStorage.getItem(lockkey+user_id);
	if (data)return true;
	else return false;
}
function verifyLocks(){
	if (HasLock()){
		var ol=ECClientCFG.overrideLocks;
		ECClientCFG.overrideLocks=false;
		ECClientCFG.unlocking=true;
		ecc.lockScreen(function(){
			ECClientCFG.overrideLocks=ol;
			
		});
	} else {
		
	}
}

/*
 * QUEUE
 */
function fixOutboxCount(){
	$('#outbox-count').html(getLocalQueueCount());
}

function openQueueDialog(){
	var popup=rcmail.show_popup_dialog(
		'<div class="outbox-dialog-settings">'+ecobj.get_label('ec_plugin.outbox_settings')+
		'<div class="outbox-dialog-status"></div>'+
		'<a class="clear">Clear</a><a class="start">Start</a><a class="stop">Stop</a>'+
		'</div>'+
		'<div class="outbox-dialog-title">'+ecobj.get_label('ec_plugin.outbox_msg')+
		'</div>'+
		'<div class="outbox-dialog-list">'+'</div>'+
		'<div class="outbox-dialog-error">'+
		'</div>',
		ecobj.get_label('ec_plugin.outbox_title'),
		[
			{
				text: ecobj.get_label('ec_plugin.pass_popup_ok'),
				'class': 'mainaction',
				click: function () {
					var $dialog = $(this);
					__queue_reset_content=null;
					$dialog.dialog('close');
				}
			}
		],{
			resizable:false,
			dialogClass:'outbox-dialog'
		}
	);
	
	$('.clear', popup).click(function(){
		clearQueueFail();
		resetContent();
		if (ECClientCFG.debugExt)log('Queue fail clear');
	});
	$('.start', popup).click(function(){
		ECClientCFG.autoResumeQueue=true;
		resetContent();
		if (ECClientCFG.debugExt)log('Queue auto resume enabled');
	});
	$('.stop', popup).click(function(){
		ECClientCFG.autoResumeQueue=false;
		stopQueue();
		resetContent();
		if (ECClientCFG.debugExt)log('Queue auto resume disabled, queue stopped');
	});
	function resetContent(){
		$('.outbox-dialog-list',popup).empty();
		var queue=getLocalQueue();
		var failed=0;
		var maxfail=0;
		for(var i=0;i<queue.length;i++){
			var q=queue[i];
			if (!q.i)q.i=generateBoundary();
			if (q.f && q.f>0){
				failed++;
				maxfail=Math.max(maxfail,q.f);
			}
			var item='<div class="outbox-list-item">'+
			'<span class="o-subject"></span>'+
			'<span class="o-size"></span>'+
			'</div>';
			var itemj=$(item);
			var encimg='<img class="enc-img" src="/skins/outlook/skin/images/ec_crypt_icon.png">';
			$('.o-subject',itemj).html((q.d.indexOf('&_ec_enc=1&')>=0 && ECClientCFG.useEncIcon ? encimg : '')+q.t);
			$('.o-size',itemj).html('('+(q.f ? q.f : '0')+') '+getSizeFormat(q.s));
			if (i%2==0)itemj.addClass('outbox-list-item-odd');
			$('.outbox-dialog-list',popup).append(itemj);
		}
		
		var status=2;
		var cls2St={1:'color-green',2:'color-red',3:'color-red',4:'color-dark-blue'};
		if (__queue_started){
			if (maxfail>=ECClientCFG.queueMaxFail)status=3;
			else if (failed<ECClientCFG.maxFailGoodService)status=1;
			else status=4
		}
		if (ECClientCFG.debugExt)log(cls2St[status],ecobj.get_label('ec_plugin.queue_status'+status));
		$('.outbox-dialog-status',popup).each(function(){
			for(var key in cls2St)$(this).removeClass(cls2St[key]);
			$(this).addClass(cls2St[status]).html(ecobj.get_label('ec_plugin.queue_status'+status));
		});
		setLocalQueue(queue);
	}
	resetContent();
	return resetContent;
}

/*
 * PASSPHRASE PASSWORD
 */
var __pkd_pass_timeoutid;
var __pkd_pass_dialog_timeoutid;
var __pkd_block_timeout=false;
var __pkd_popup_visible=false;
var __pkd_popup_continue_handler=null;
function initPKD(clear){
	var passphrase = ecc.getPassphrase(true);
	if (!passphrase) {
		ecc.lockScreen();
	}
	else {
		if (!__pkd_block_timeout){
			initPassphraseTimeout();
		}
	}
	pkd = new PKDClient(null, passphrase, clear);
}
function initPassphraseTimeout(){
	if (ECClientCFG.enablePassphraseDiscard){
		window.clearTimeout(__pkd_pass_timeoutid);
		var timeout=rcmail.env.ec_pass_timeout || ECClientCFG.passphraseTimeout;
		var exp=ecc.getPassphraseExp();
		var curtime=getTime();
		var curexp=Math.max(exp, curtime+timeout);
		ecc.setPassphraseExp(curexp);
		var truetimeout=curexp-curtime;
		if (rcmail.env.action!='preview') 
			timeoutPassphrase(truetimeout<0 ? 0 : truetimeout);
	}
}
function timeoutPassphrase(timeout){
	__pkd_pass_timeoutid=ecc.verifyTimeout(function(){
		if (ecc.isLocked())return;
		ecc.setPassphrase('');
		ecc.setKeyHandler('', true);
		new requestKeyStatus().clearKeyCache();
		setPassphrase();
	}, timeout, ecc.getPassphraseExp, null, function(id){
		__pkd_pass_timeoutid=id;
	});
}
function isPassphraseVisible(){
	if (rcmail.is_framed()){
		return parent.__pkd_popup_visible;
	}
	return __pkd_popup_visible;
}
function setPassphrase(successhandler) {
	if (rcmail.is_framed()){
		parent.setPassphrase(successhandler);
		return;
	}
	if (__pkd_popup_visible || $('.passphrase-dialog .ui-dialog-content').length>0)return;
	__pkd_popup_visible=true;
	window.clearTimeout(__pkd_pass_dialog_timeoutid);
	var phtml='<div class="form-container">'+
		'<div class="logo-spac">'+
			'<div class="form-logo">'+
			'	<a href="#"><img src="/skins/outlook/ppd/form-logo.png"/></a>'+
			'</div>'+
			'<div class="webmail-sec">'+
			'	<p class="pass-headline">'+ecobj.get_label('ec_plugin.pass_headline')+'</p>'+
			'</div>'+
		'</div>	'+
		'<div class="flash-msg no-msg"><label>&nbsp;</label></div>'+
		'<div class="form-spac2">'+
		'<div id="form" style="">'+
		'	<div class="textfield-sec">'+
		'<span class="passphrase-email">'+rcmail.env.ec_identities[0].email+'</span>'+
		'		<input id="passphrase" type="password" name="pass" placeholder="'+ecobj.get_label('ec_plugin.pass_placeholder')+'"/>'+
		'	</div>'+
		'	<div class="signup-loginsec">'+
		'		<div id="login_menu_btn" class="login-btn">'+
		'			<a href="">'+ecobj.get_label('ec_plugin.pass_popup_ok')+'</a>'+
		'		</div>'+
		'		<div id="logout_menu_btn" class="logout-btn">'+
		'			<a href="">'+ecobj.get_label('ec_plugin.pass_popup_logout')+'</a>'+
		'		</div>'+
		'	</div>'+
		'</div>'+
	'</div>	'+
	'</div>';
	var defhtml='<div class="passphrase-dialog-title">'+ecobj.get_label('ec_plugin.pass_popup_msg')+'</div>'+
	'<input type="password" id="passphrase"/>'+
	'<div class="passphrase-dialog-error">'+
	'</div>';
	var requesting=false;
	__pkd_block_timeout=true;
	var popup=rcmail.show_popup_dialog(
		phtml,
		ecobj.get_label('ec_plugin.pass_popup_enter'),
		[
			{
				text: ecobj.get_label('ec_plugin.pass_popup_ok'),
				'class': 'mainaction',
				click: function () {
					if (ECClientCFG.debugExt)log("OK clicked");
					var $dialog=$('.passphrase-dialog .ui-dialog-content')
					window.clearTimeout(__pkd_pass_dialog_timeoutid);
					var passphrase=$dialog.find("#passphrase").val();
					ecc.setPassphrase(passphrase, true);
					$('.passphrase-dialog .flash-msg').removeClass('error-msg green-msg no-msg').addClass('green-msg') 
					.html('<label>'+ecobj.get_label('ec_plugin.pass_popup_check')+'</label>');
					initPKD(true);
					checkEncDec(function(valid){
						if (valid){
							window.clearInterval(verifyid);
							$(window).unbind('resize',onresize);
							ecc.unlockScreen();
							hidePassphrase($dialog);
							if (successhandler)successhandler();
						} else {
							requesting=false;
							$('#login_menu_btn a',popup).removeClass('disable-passphrase-ok');
							$('.passphrase-dialog .flash-msg').removeClass('error-msg green-msg no-msg').addClass('error-msg') 
							.html('<label>'+ecobj.get_label('ec_plugin.pass_popup_error')+'</label>');
							__pkd_pass_dialog_timeoutid=setTimeout(function(){
								logoutFromPopup();
							},ECClientCFG.passphraseDialogLogout);
						}
					});
				}
			},
			{
				text: ecobj.get_label('ec_plugin.pass_popup_logout'),
				click: function () {
					if (ECClientCFG.debugExt)log('logout clicked');
					logoutFromPopup();
				}
			}
		],{
			resizable:false,
			dialogClass:'passphrase-dialog',
			closeOnEscape:false
		}
	);
	$('#login_menu_btn a',popup).click(function(){
		if (requesting)return false;
		requesting=true;
		$(this).addClass('disable-passphrase-ok');
		$($('.passphrase-dialog .ui-dialog-buttonset button')[0]).click();
		return false;
	});
	$('#logout_menu_btn a',popup).click(function(){
		$($('.passphrase-dialog .ui-dialog-buttonset button')[1]).click();
		return false;
	});
	function logoutFromPopup(){
		ECClientCFG.loggingOut=true;
		$('#form', popup).hide();
		$('.pass-headline', popup).html(ecobj.get_label('ec_plugin.loggingout'));
		$(popup).css({'pointer-events': 'none'});
		ECClientCFG.lockOnLogout=false;
		ecc.onLogout();
	}
	$('.ui-widget-overlay').addClass('passphrase-dialog-overlay');
	__pkd_pass_dialog_timeoutid=setTimeout(function(){
		logoutFromPopup();
	},ECClientCFG.passphraseDialogLogout);
	function onresize(){
		var d=$('.passphrase-dialog');
		var ww=$(window).width(); var hh=$(window).height();
		var dw=d.width(); var dh=d.height();
		d.css({left:(ww-dw)*0.5+'px', top:(hh-dh)*0.5+'px'});
		
	};
	$(window).bind('resize',onresize);
	
	var passexp=ecc.getPassphraseExp();
	var verifyid;
	if (ECClientCFG.loggingOut){
		$('#form',popup).hide();
		$('.pass-headline',popup).html(ecobj.get_label('ec_plugin.loggingout'));
		$(popup).css({'pointer-events':'none'});
	} else if (ECClientCFG.unlocking) {
		$('#form',popup).hide();
		$('.pass-headline',popup).html(ecobj.get_label('ec_plugin.pass_popup_check'));
		window.clearInterval(verifyid);
		$(window).unbind('resize',onresize);
		ecc.unlockScreen();
		hidePassphrase(popup);
	} else {
		if (ECClientCFG.verifyPassphraseDialog){
			verifyid=ecc.verifyInterval(function(){
				window.clearTimeout(__pkd_pass_dialog_timeoutid);
				ecc.unlockScreen();
				initPKD(true);
				var $dialog=$('.passphrase-dialog .ui-dialog-content');
				$(window).unbind('resize',onresize);
				hidePassphrase($dialog);
			}, 100, ecc.getPassphraseExp, passexp);
		}
	}
}
function hidePassphrase($dialog){
	if (ECClientCFG.loggingOut)return;
	$dialog.dialog('close');
	__pkd_popup_visible=false;
	__pkd_block_timeout=false;
	initPassphraseTimeout();
	if (__pkd_popup_continue_handler){
		var h=__pkd_popup_continue_handler;
		__pkd_popup_continue_handler=null;
		h();
	}
}

/*
* ERRORS
*/

function executeerrorlogic(){
	if (!rcmail.env.uid && rcmail.env.action=='preview'){
		if (rcmail.is_framed()){
			parent.loadNextListUid();
		} else {
			loadNextListUid();
		}
	}
}

function getNextListUid(){
	var currentuid=rcmail.get_single_uid().toString();
	var msgs=getSortedMessages();
	var nextuid=null;
	if (!currentuid)nextuid=msgs[0];
	else {
		var index=msgs.indexOf(currentuid);
		if (index>=0)nextuid=msgs[index+1];
		if (!nextuid)nextuid=msgs[0];
	}
	return nextuid;
}

function loadNextListUid(){
	var uid=getNextListUid();
	rcmail.clear_previewcontent();
	rcmail.message_list.select(uid);
}

function displayLockBoardLoader(){
	$('body').prepend('<div class="lockboard"></div>');
}
function hideLockBoardLoader(){
	$('body .lockboard').remove();
}

function checkRCUserId(){
	setClassStorage("rc_userid",rcmail.env.user_id,null,null,null,true);
	var checkuseridinterval=setInterval(function(){
		var lsuserid=localStorage.getItem("rc_userid");
		if ((lsuserid && lsuserid!=rcmail.env.user_id) || (lsuserid!=rcmail.env.user_id && !HasLock())){
			window.clearInterval(checkuseridinterval);
			if (!rcmail.is_framed()){
				window.location.reload();
			}
		}
	},60000);
}

function checkLogState(skipuserid){
	if (ECClientCFG.loggingOut)return false;
	if (!skipuserid && !localStorage.getItem("rc_userid"))return false;
	return true;
}

var __sessionClassStorage={};
function getClassStorage(key){
	if (rcmail.is_framed()){
		return parent.getClassStorage(key);
	}
	if (__sessionClassStorage[key])return __sessionClassStorage[key];
	var ls=localStorage.getItem(key);
	if (key=="user_passphrase" && !ECClientCFG.localPassphrase){
		__sessionClassStorage[key]=ls;
		localStorage.removeItem(key);
	}
	return ls;
}

function removeClassStorage(key){
	delete __sessionClassStorage[key];
	localStorage.removeItem(key);
}

function setClassStorage(key,d,trylock,trylist,tryemail,skipuserid){
	if (!checkLogState(skipuserid))return false;
	if (trylock===undefined)trylock=true;
	if (trylist===undefined)trylist=true;
	if (tryemail===undefined)tryemail=true;
	
	if (key=="user_passphrase" && !ECClientCFG.localPassphrase){
		__sessionClassStorage[key]=d;
		localStorage.removeItem(key);
		return true;
	}
	
	try{
		localStorage.setItem(key,d);
	}catch(e){
		if (trylock){
			ClearLockStorage(null,true);
			return ecc.setClassStorage(key,d,false,trylist,tryemail);
		}
		if (trylist){
			ecc.hardCacheClean("listCache");
			return ecc.setClassStorage(key,d,trylock,false,tryemail);
		}
		if (tryemail){
			ecc.hardCacheClean("emailCache");
			return ecc.setClassStorage(key,d,trylock,trylist,false);
		}
		return false;
	}
	return true;
}