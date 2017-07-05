/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

function EC_API(cfg, options){
	var o=this;
	
	o.cfg=cfg;
	o.options=options;
	o.uid=randomStr(8);
	o.element=$('<div></div>');
	o.element.attr('id',o.uid);
	o.requestAPI=function(command, data, handler){
		
	};
	o.bind=function(e,h){
		o.element.bind(e,h);
	};
	o.trigger=function(e,d){
		o.element.trigger(e,d);
	};
	o.sendMail=function(){
		
	};
	o.getMail=function(){
		
	};
	o.getList=function(){
		
	};
	o.getHeaders=function(){
		
	};
	o.getFolders=function(){
		
	};
	o.editMail=function(){
		
	};
	o.editFolder=function(){
		
	};
	o.deleteMail=function(){
		
	};
	o.newView=function(){
		
	};
	o.newCompose=function(){
		
	};
	o.newSettings=function(){
		
	};
	
	return o;
}



