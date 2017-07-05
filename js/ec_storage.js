/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

//pushLocalQueue(String action, Object data, String title, Number size, String n=null, String nc=null) : int
//adds data to local queue, custom name in n and nc, returns queue length
function pushLocalQueue(action, data, title, size, n, nc){
	if (!n)n='ec_localQueue';
	var o={a:action,d:data,t:title,s:size};
	var arr=localStorage.getItem(n);
	if (!arr)arr=[];
	else arr=JSON.parse(arr);
	arr.push(o);
	var r=setLocalQueue(arr,n,nc);
	if (!r)return false;
	return arr.length;
}
//setLocalQueue(Array arr, String n, String nc) : Boolean
function setLocalQueue(arr,n,nc){
	if (!n)n='ec_localQueue';
	if (!nc)nc='ec_localQueue_count';
	try{
		localStorage.setItem(n,JSON.stringify(arr));//@ls
	} catch(e){
		return false;
	}
	try{
		localStorage.setItem(nc,arr.length);//@ls
	}
	catch(e){
		localStorage.removeItem(n);
		return false;
	}
	return true;
}
//getLocalQueue(String n) : Array
function getLocalQueue(n){
	if (!n)n='ec_localQueue';
	var arr=localStorage.getItem(n);
	if (!arr)arr=[];
	else arr=JSON.parse(arr);
	return arr;
}
//getQueueByAction(String a, String n) : Array
function getQueueByAction(a,n){
	var q=getLocalQueue(n);
	var qq=[];
	for(var i=0;i<q.length;i++){
		if (a && q[i].a==a)
			qq.push(q[i]);
	}
	return qq;
}
//getLocalQueueCount(String n) : int
function getLocalQueueCount(n){
	if (!n)n='ec_localQueue_count';
	return parseInt(localStorage.getItem(n) || '0');
}
//clearLocalQueue(String n) : void
function clearLocalQueue(n){
	if (!n)n='ec_localQueue';
	localStorage.setItem(n,'');
}
//clearQueueFail(String n, String nc) : void
function clearQueueFail(n,nc){
	var queue=getLocalQueue(n);
	for(var i=0;i<queue.length;i++){
		delete queue[i].f;
	}
	setLocalQueue(queue,n,nc);
}

//pushRecipientsToLocalStorage(Array recipients) : void
function pushRecipientsToLocalStorage(recipients){
	var cr=localStorage.getItem("cachedRecipients");
	if (!cr)cr='';
	var emails=cr.split(',');
	for(var i=0;i<recipients.length;i++){
		var recipient=recipients[i];
		if (recipient && emails.indexOf(recipient)<0 && emails.length<ECClientCFG.maxCachedRecipients){
			cr+=(cr.length>0 ? ',' : '')+recipient;
			localStorage.setItem("cachedRecipients",cr);//@ls
		}
	}
}
//removeRecipientFromLocalStorage(String id) : Boolean
function removeRecipientFromLocalStorage(id){
	var d=localStorage.getItem('cachedRecipients').split(',');
	var ind=d.indexOf(id);
	if (ind>=0){
		d.splice(ind,1);
		localStorage.setItem('cachedRecipients',d.join(','));
		return true;
	}
	return false;
}

//createLocalSession(String task, Object data, String uid=null) : String
//creates new local session based on task and session data, option to use custom or old uid, return generated session id
function createLocalSession(task, data, uid){
	var id=uid || generateBoundary();
	if (!data)data={};
	pushLocalQueue(task, data, id, 0, 'ec_session', 'ec_session_count');
	return id;
}
//updateLocalSession(String id, Object data, Object ext=null, Boolean skipdata=null, Object calldata=null, Function exe=null) : Boolean
//updates session data by id, additional data by ext, optio to add calldata and execute handler with calldata array
function updateLocalSession(id, data, ext, skipdata, calldata, exe){
	var q=getLocalQueue('ec_session');
	var qo=null;
	for(var i=0;i<q.length;i++){
		if (q[i].t==id){
			qo=q[i];
			break;
		}
	}
	if (qo){
		qo.s=getTime();
		if (calldata){
			if (!qo.cd) qo.cd=[];
			qo.cd.push(calldata);
		}
		if (exe && qo.cd && qo.cd.length>0){
			qo.cd=exe(qo.cd);
		}
		if (!data)data={};
		if (!skipdata) qo.d=data;
		if (ext){
			for(var key in ext)qo[key]=ext[key];
		}
		setLocalQueue(q,'ec_session', 'ec_session_count');
		return true;
	}
	
	return false;
}
//deleteLocalSession(String id) : Boolean
//deleted a local session based on session id, return true/false if success
function deleteLocalSession(id){
	var q=getLocalQueue('ec_session');
	for(var i=0;i<q.length;i++){
		if (q[i].t==id){
			q.splice(i,1);
			setLocalQueue(q,'ec_session', 'ec_session_count');
			return true;
		}
	}
	return false;
}
//clearLocalSessions(Number beforetime) : Array
//clears all sessions from local storage compred to UTC timestamp, returns sessions
function clearLocalSessions(beforetime){
	var q=getLocalQueue('ec_session');
	var newq=[];
	for(var i=0;i<q.length;i++){
		if (q[i].s>beforetime){
			newq.push(q[i]);
		}
	}
	setLocalQueue(newq,'ec_session', 'ec_session_count');
	return newq;
}
//masterQueue(String id, String task, String action, String vname, Object data) : Boolean
//verifies and assigns master Q according to vname key, returns true/false for success
function masterQueue(id, task, action, vname, data){
	if (!task)task='';
	if (!action)action='';
	var q=getQueueByAction(task+'-'+action,'ec_session');
	var mq=null;
	for(var i=0;i<q.length;i++){
		var qo=q[i];
		if (qo.d[vname]){
			mq=qo;
			break;
		}
	}
	if (!mq){
		data[vname]=1;
		updateLocalSession(id, data);
		return true;
	}
	else if (mq.t==id) return true;
	return false;
}
//checkMasterQueue(String id, String task, String action, String vname, Object data, Function changehandler) : Boolean
//verifies and assigns master Q according to vname key, calls a function in case of change
function checkMasterQueue(id, task, action, vname, data, changehandler){
	var m=data[vname];
	var r=masterQueue(id, task, action, vname, data);
	if (m!=data[vname]){
		if (changehandler) changehandler();
	}
	return r;
}
//callSession(String caller, String id, String method, Object data, Number timeout) : Boolean
//calls id session according to implementation, caller - session id, executes updatelocalsession
function callSession(caller, id, method, data, timeout){
	if (timeout){
		return setTimeout(function(){
			updateLocalSession(id, null, null, true, {c:caller,m:method,d:data});
		},timeout);
	}
	return updateLocalSession(id, null, null, true, {c:caller,m:method,d:data});
}

/*
 * SESSIONS
 */
var __session_id;
var __update_session_interval_id;
var __sessionCalls={};
var __sessionR=[];
function createECSession(id, lockhandler){
	__session_id=createLocalSession(id);
	updateECSession();
	__update_session_interval_id=setInterval(function(){
		if (lockhandler && lockhandler(id))return;
		ECClientCFG.sessionData.href=window.location.href;
		var ur=updateECSession();
		if (!ur){
			createLocalSession(id,null,__session_id);
			updateECSession();
		}
		clearLocalSessions(getTime()-ECClientCFG.sessionKeepAlive);
	}, ECClientCFG.updateSessionInterval);
}
function getECSessions(task, action){
	return getQueueByAction(task+'-'+action,'ec_session');
}
function exeECSession(cd){
	var newcd=[];
	for(var i=0;i<cd.length;i++){
		var c=cd[i];
		if (__sessionCalls[c.m]){
			var r=__sessionCalls[c.m](c.d,c.c);
			if (r===true)newcd.push(c);
			else if (r)callSession(__session_id,c.c,c.m+'_response',r,1);
		}
	}
	cd=newcd;
	return cd;
}
function addSessionExe(m,h){
	__sessionCalls[m]=h;
}
function updateECSession(){
	return updateLocalSession(__session_id, ECClientCFG.sessionData, null, false, null, exeECSession);
}

/*
 * QUEUE
 */

var __queue_timeoutid=0;
var __queue_send_timeoutid=0;
var __queue_stop_method;
var __queue_started=false;
var __queue_object=null;
var __queue_reset_content=null;
var __queueUpdateFunction=null;
function startQueue(timeout){
	stopQueue();
	__queue_started=true;
	if (__queue_reset_content) __queue_reset_content();
	__queue_timeoutid=setTimeout(function(){
		var queue=getLocalQueue();
		if (queue.length==0){
			stopQueue();
			return;
		}
		var o=queue[0];
		if (o.f>=ECClientCFG.queueMaxFail){
			onQueueSent(o,true);
			return;
		}
		if (!o.i)o.i=generateBoundary();
		setLocalQueue(queue);
		__queue_send_timeoutid=setTimeout(function(){
			onQueueSent(o,true);
		},ECClientCFG.queueSendTimeout);
		__queue_object=o;
		__queue_stop_method=sendFromQueue(o,onQueueSent);
	}, timeout>0 || timeout===0 ? timeout : ECClientCFG.queueTimeout);
	
}
function onQueueSent(o,pushback){
	stopQueue();
	if (getLocalQueueCount()==0)return;
	var queue=getLocalQueue();
	var failed=0;
	var u=false;
	if (o){
		for(var i=0;i<queue.length;i++){
			if (queue[i].i=o.i){
				queue.splice(i,1);
				u=true;
				break;
			}
		}
		if (pushback){
			queue.push(o);
			if (!o.f)o.f=0;
			o.f++;
			u=true;
		}
	}
	for(i=0;i<queue.length;i++){
		if (queue[i].f && queue[i].f>=ECClientCFG.queueMaxFail)failed++;
	}
	setLocalQueue(queue);
	if (__queueUpdateFunction) __queueUpdateFunction();
	if (queue.length>0 && failed<queue.length)startQueue();
	else if (u && __queue_reset_content) __queue_reset_content();
}
function stopQueue(){
	if (__queue_started){
		__queue_started=false;
		__queue_object=null;
		if (__queue_stop_method)__queue_stop_method();
		__queue_stop_method=null;
		if (__queue_reset_content) __queue_reset_content();
		window.clearTimeout(__queue_timeoutid);
		window.clearTimeout(__queue_send_timeoutid);
	}
}