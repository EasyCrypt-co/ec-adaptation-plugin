/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

var regNL = /\n|\r/;
var regWS = / |	/;
var regQ = /"|'/;
var NL="\r\n";

var is_chrome = /chrome/i.test( navigator.userAgent );

var log=null;
function log_(){
    if(console && ECClientCFG.debug){
        console.log.apply(console, arguments);
    }
}
if (ECClientCFG.debug && console && console.log && is_chrome)log=console.log;
else log=log_;

function troll(id){
	throw new Error(id);
}

(function addXhrProgressEvent($) {
    var originalXhr = $.ajaxSettings.xhr;
    $.ajaxSetup({
        xhr: function() {
            var req = originalXhr(), that = this;
            if (req) {
                if (typeof req.addEventListener == "function" && that.progress !== undefined) {
                    req.addEventListener("progress", function(evt) {
                        that.progress(evt);
                    }, false);
                }
                if (typeof req.upload == "object" && that.progressUpload !== undefined) {
                    req.upload.addEventListener("progress", function(evt) {
                        that.progressUpload(evt);
                    }, false);
                }
            }
            return req;
        }
    });
})(jQuery);

//fromNL(String val):String
function fromNL(val){
	return val.split(NL).join('\n');
}
//toNL(String val):String
function toNL(val){
	return fromNL(val).split('\n').join(NL);
}

/*
 * BINARY
 */

//getSizeFormat(Number size,String prefix):String
function getSizeFormat(size,prefix){
	var sizes=['B','KB','MB'];
	var asize=prefix || '';
	if (size<512)asize+=size+sizes[0];
	else if (size<1048576)asize+=Math.round(size/1024)+sizes[1];
	else asize+=(size/1048576).toFixed(1)+sizes[2];
	return asize;
}
//readFile(File file, Function output, String type, String encoding):void
function readFile(file, output, type, encoding){
	var reader = new FileReader();
	reader.onload = function(e) {
	  var rawData = reader.result;
	  output(rawData, file);
	}
	switch(type){
	case 'text':
		reader.readAsText(file, encoding);
		break;
	case 'url':
		reader.readAsDataURL(file);
		break;
	case 'array':
		reader.readAsArrayBuffer(file);
		break;
	case 'binary':
	default:
		reader.readAsBinaryString(file);
	}
}
//downloadFile(Object data,String name,String type,Bool binary):void
function downloadFile(data,name,type,binary){
	var a = $("<a style='display: none;'/>");
	var bin=binary ? data : toBinary(data);
	var blob = new Blob([bin], {type: type});
	var url = window.URL.createObjectURL(blob);
    a.attr("href", url);
    a.attr("download", name);
    $("body").append(a);
    a[0].click();
    a.remove();
    
    setTimeout(function(){
    	window.URL.revokeObjectURL(url);
    }, ECClientCFG.revokeTimeout);
}
//toBinary(String data):Uint8Array
function toBinary(data){
	var arraybuffer = new ArrayBuffer(data.length);
    var view = new Uint8Array(arraybuffer);
    for (var i=0; i<data.length; i++) {
        view[i] = data.charCodeAt(i) & 0xff;
    }
    return view;
}
//fromBinary(Object data):String
function fromBinary(data){
	return String.fromCharCode.apply(null, data);
}
//getStringByteSize(String str):Number
function getStringByteSize(str){
	return new Blob([str],{type:'plain/text'}).size;
}
//getLocalStorageSize():Number
function getLocalStorageSize(){
	var total=0;
	for(var i=0;i<localStorage.length;i++){
		total+=getStringByteSize( localStorage.getItem( localStorage.key(i) ) );
	}
	return total;
}

/*
 * STRING
 */

//toZeroString(String val,int length):String
function toZeroString(val,length){
	val=val+'';
	while(val.length<length)val='0'+val;
	return val;
}
//htmlWS(String val, Bool convertspaces):String
function htmlWS(val, convertspaces){
	val=val.split('\n').join('<br/>');
	if (convertspaces)
		val = val.split(' ').join('&nbsp;');
	return val;
}
//quoteContent(String val, Bool html):String
function quoteContent(val, html){
	if (html){
		return '<blockquote>'+val+'</blockquote>';
	}
	var valspl=val.split('\n');
	for(var i=0;i<valspl.length;i++){
		valspl[i]='> '+valspl[i];
	}
	return valspl.join('\n');
}
//splitInLines(Array val, int num):Array
function splitInLines(val, num){
	var spl=[];
	while(val.length>0){
		var nv=val.substr(0,num);
		val=val.substr(num)
		spl.push(nv);
	}
	return spl;
}
//packString(String val, Boolean reversed):String
function packString(val, reversed){
	var spl=val.split(regNL);
	var str=packStringLines(spl);
	if (reversed){
		str.reverse()
		str=packStringLines(str);
		str.reverse();
	}
	return str.join(NL);
}
//packStringLines(Array spl):Array
function packStringLines(spl){
	var str=[];
	for(var i=0;i<spl.length;i++){
		var line=spl[i];
		var newline='';
		for(var j=0;j<line.length;j++){
			var ch=line.charAt(j);
			if ((ch==' ' || ch=='	') && !newline)continue;
			newline+=ch;
		}
		if (newline || str.length>0){
			str.push(newline);
		}
	}
	return str;
}
//serializeURLParams(Object d) : String
function serializeURLParams(d){
	var s='';
	for(var key in d){
		if (s)s+='&';
		s+=key+'='+encodeURIComponent( d[key] );
	}
	return s;
}

/*
 * HTML
 */

//getConfirmDialogHtml(String id,String msg,String title):jQuery
function getConfirmDialogHtml(id,msg,title){
	var dialog='<div id="'+id+'" title="'+title+'"></div>';
	var j=$(dialog);
	j.append('<p><span class="ui-icon ui-icon-alert" style="float:left; margin:12px 12px 20px 0;"></span>'+msg+'</p>');
	return j;
}
//wrapHtmlBody(String emailBody):String
function wrapHtmlBody(emailBody){
	emailBody='<html>'+
	'<head>'+'<meta http-equiv="Content-Type" content="text/html; charset="UTF-8" />'+'</head>'+'<body>'+'\n'+emailBody+'\n'+'</body>'+'</html>';
	return emailBody;
}
//linkify(String txt):String
function linkify(txt) {
    var rt=null;
    var rp1=/(\b(https?|ftp|ssh|arp|dhcp|dns|dsn|imap|icmp|idrp|ip|irc|pop3|par|rlogin|smtp|ssl|ssh|tcp|telnet|upd|ups):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    var rp2=/(^|[^\/])(www\.[\S]+(\b|$))/gim;
    var rp3=/(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
    
    rt = txt.replace(rp1, '<a class="autolinkify" href="$1" target="_blank">$1</a>');
    rt = rt.replace(rp2, '$1<a class="autolinkify" href="http://$2" target="_blank">$2</a>');
    rt = rt.replace(rp3, '<a class="autolinkify" href="mailto:$1">$1</a>');

    return rt;
}

//checkRootParentTag(jQuery obj, String nodename):Boolean
function checkRootParentTag(obj, nodename){
	if (!obj || obj.length==0)return false;
	var p=obj.parent();
	while(p && p.length>0){
		if (p[0].nodeName.toLowerCase()==nodename.toLowerCase()){
			return true;
		}
		p=p.parent();
	}
	
	return false;
}
//depthIterateJChildren(jQuery container, Function handler, String checkTag):void
function depthIterateJChildren(container, handler, checkTag){
	var nodes=container[0].childNodes;
	for(var i=0;i<nodes.length;i++){
		var t=$(nodes[i]);
		var tn=t[0].nodeName.toLowerCase();
		if (ECClientCFG.textNodes.indexOf(tn)<0) continue;
		if (!checkRootParentTag(t,checkTag)){
			if (t[0].childNodes.length>0)depthIterateJChildren(t,handler,checkTag);
			else handler(t);
		}
	}
}
//changeNodeList(Array newnodes):void 
//newnodes array of jquery elements 0=[old,newone]
function changeNodeList(newnodes){
	for(var n=0;n<newnodes.length;n++){
		var no=newnodes[n];
		var p=no[0].parent()[0];
		var pcnl=p.childNodes;
		var arpcnl=Array.apply(null, pcnl);
		for(var j=0;j<arpcnl.length;j++){
			if (pcnl[j]==no[0][0]){
				arpcnl.splice(j,1);
				var newnodes2=no[1][0].childNodes;
				for(var nn=0;nn<newnodes2.length;nn++){
					arpcnl.splice(j+nn,0,newnodes2[nn]);
				}
				no[0].parent().empty();
				for(nn=0;nn<arpcnl.length;nn++)p.appendChild(arpcnl[nn]);
				break;
			}
		}
	}
}

/*
 * GENERATORS
 */

//generateBoundary():String
function generateBoundary(){
	var $b=randomStr(6)+'-'+randomStr(4)+'-'+randomStr(4)+'-'+randomStr(4)+'-'+randomStr(12);
	return $b;
}
//randomStr(int length):String
function randomStr(length){
	var str='';
	for(var i=0;i<length;i++){
		str+=ECClientCFG.randomChar.charAt( getRandomInt(0,ECClientCFG.randomChar.length-1) );
	}
	return str;
}
//getRandomInt(int min, int max):int
function getRandomInt(min, max) {
	return Math.round(Math.random() * (max - min)) + min;
}
//openBoundary(String b):String
function openBoundary(b){return '--'+b;}
//closeBoundary(String b):String
function closeBoundary(b){return '--'+b+'--';}

//getTime():Number
function getTime(){
	return new Date().getTime();
}

/*
 * ENCODE DECODE
 */

//quoted_printable_decode_(Array lines, Bool html):String
function quoted_printable_decode_(lines, html){
	for(var i=0;i<lines.length;i++){
		var line=lines[i];
		if (line.charAt(line.length-1)=='=')line=line.substr(0,line.length-1);
		line=quoted_printable_decode(line);
		lines[i]=line;
	}
	return utf8Decode(lines.join(html ? '' : '\n'));
}

//_8bit_decode_(Array lines, Bool html, String htmlJoin, Bool win1255):String
function _8bit_decode_(lines, html, htmlJoin, win1255){
	if (!htmlJoin)htmlJoin='';
	for(var i=0;i<lines.length;i++){
		var line=lines[i];
		lines[i]=line;
	}
	if (win1255){
		return windows1255.decode(lines.join(html ? htmlJoin : '\n'));
	}
	return utf8Decode(lines.join(html ? htmlJoin : '\n'));
}
//quoted_printable_decode(String str):String
function quoted_printable_decode(str){
  var RFC2045Decode1 = /=\r\n/gm;
  var RFC2045Decode2IN = /=([0-9A-F]{2})/gim;
  var RFC2045Decode2OUT = function (sMatch, sHex) {
	  return String.fromCharCode(parseInt(sHex, 16));
  }
  return str.replace(RFC2045Decode1, '').replace(RFC2045Decode2IN, RFC2045Decode2OUT);
}
//quoted_printable_encode(String str):String - does not work
function quoted_printable_encode(str){
	var hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F']
	var RFC2045Encode1IN = / \r\n|\r\n|[^!-<>-~ ]/gm
	var RFC2045Encode1OUT = function (sMatch) {
		if (sMatch.length > 1) {
    		return sMatch.replace(' ', '=20')
    	}
    	var chr = sMatch.charCodeAt(0);
    	return '=' + hexChars[((chr >>> 4) & 15)] + hexChars[(chr & 15)];
	}
	var RFC2045Encode2IN = /.{1,72}(?!\r\n)[^=]{0,3}/g;
	var RFC2045Encode2OUT = function (sMatch) {
		if (sMatch.substr(sMatch.length - 2) === '\r\n') {
			return sMatch;
    	}
    	return sMatch + '=\r\n'
	}
	str = str.replace(RFC2045Encode1IN, RFC2045Encode1OUT).replace(RFC2045Encode2IN, RFC2045Encode2OUT);
	return str.substr(0, str.length - 3);
}
//base64_decode_(Array lines, Bool html, Bool win1255):String
function base64_decode_(lines, html, win1255){
	var newlines=[];
	for(var i=0;i<lines.length;i++){
		var line=lines[i];
		if (line)newlines.push(line);
	}
	var b=newlines.join('');
	b=Base64.decode(b,false,win1255);
	return b;
}
//base64_decode(String $input):String
function base64_decode($input){	return atob($input);}
//base64_encode(String $input):String
function base64_encode($input){	return btoa($input);}
//html_encode(String value):String
function html_encode(value){ return $('<div/>').text(value).html(); }
//html_decode(String value):String
function html_decode(value){ return $('<div/>').html(value).text(); }

/*! https://mths.be/windows-1255 v1.0.0 by @mathias | MIT license */
;(function(root) {

	// Detect free variables `exports`.
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`.
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js/io.js or Browserified code,
	// and use it as `root`.
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var object = {};
	var hasOwnProperty = object.hasOwnProperty;
	var stringFromCharCode = String.fromCharCode;

	var INDEX_BY_CODE_POINT = {'129':1,'138':10,'140':12,'141':13,'142':14,'143':15,'144':16,'154':26,'156':28,'157':29,'158':30,'159':31,'160':32,'161':33,'162':34,'163':35,'165':37,'166':38,'167':39,'168':40,'169':41,'171':43,'172':44,'173':45,'174':46,'175':47,'176':48,'177':49,'178':50,'179':51,'180':52,'181':53,'182':54,'183':55,'184':56,'185':57,'187':59,'188':60,'189':61,'190':62,'191':63,'215':42,'247':58,'402':3,'710':8,'732':24,'1456':64,'1457':65,'1458':66,'1459':67,'1460':68,'1461':69,'1462':70,'1463':71,'1464':72,'1465':73,'1466':74,'1467':75,'1468':76,'1469':77,'1470':78,'1471':79,'1472':80,'1473':81,'1474':82,'1475':83,'1488':96,'1489':97,'1490':98,'1491':99,'1492':100,'1493':101,'1494':102,'1495':103,'1496':104,'1497':105,'1498':106,'1499':107,'1500':108,'1501':109,'1502':110,'1503':111,'1504':112,'1505':113,'1506':114,'1507':115,'1508':116,'1509':117,'1510':118,'1511':119,'1512':120,'1513':121,'1514':122,'1520':84,'1521':85,'1522':86,'1523':87,'1524':88,'8206':125,'8207':126,'8211':22,'8212':23,'8216':17,'8217':18,'8218':2,'8220':19,'8221':20,'8222':4,'8224':6,'8225':7,'8226':21,'8230':5,'8240':9,'8249':11,'8250':27,'8362':36,'8364':0,'8482':25};
	var INDEX_BY_POINTER = {'0':'\u20AC','1':'\x81','2':'\u201A','3':'\u0192','4':'\u201E','5':'\u2026','6':'\u2020','7':'\u2021','8':'\u02C6','9':'\u2030','10':'\x8A','11':'\u2039','12':'\x8C','13':'\x8D','14':'\x8E','15':'\x8F','16':'\x90','17':'\u2018','18':'\u2019','19':'\u201C','20':'\u201D','21':'\u2022','22':'\u2013','23':'\u2014','24':'\u02DC','25':'\u2122','26':'\x9A','27':'\u203A','28':'\x9C','29':'\x9D','30':'\x9E','31':'\x9F','32':'\xA0','33':'\xA1','34':'\xA2','35':'\xA3','36':'\u20AA','37':'\xA5','38':'\xA6','39':'\xA7','40':'\xA8','41':'\xA9','42':'\xD7','43':'\xAB','44':'\xAC','45':'\xAD','46':'\xAE','47':'\xAF','48':'\xB0','49':'\xB1','50':'\xB2','51':'\xB3','52':'\xB4','53':'\xB5','54':'\xB6','55':'\xB7','56':'\xB8','57':'\xB9','58':'\xF7','59':'\xBB','60':'\xBC','61':'\xBD','62':'\xBE','63':'\xBF','64':'\u05B0','65':'\u05B1','66':'\u05B2','67':'\u05B3','68':'\u05B4','69':'\u05B5','70':'\u05B6','71':'\u05B7','72':'\u05B8','73':'\u05B9','74':'\u05BA','75':'\u05BB','76':'\u05BC','77':'\u05BD','78':'\u05BE','79':'\u05BF','80':'\u05C0','81':'\u05C1','82':'\u05C2','83':'\u05C3','84':'\u05F0','85':'\u05F1','86':'\u05F2','87':'\u05F3','88':'\u05F4','96':'\u05D0','97':'\u05D1','98':'\u05D2','99':'\u05D3','100':'\u05D4','101':'\u05D5','102':'\u05D6','103':'\u05D7','104':'\u05D8','105':'\u05D9','106':'\u05DA','107':'\u05DB','108':'\u05DC','109':'\u05DD','110':'\u05DE','111':'\u05DF','112':'\u05E0','113':'\u05E1','114':'\u05E2','115':'\u05E3','116':'\u05E4','117':'\u05E5','118':'\u05E6','119':'\u05E7','120':'\u05E8','121':'\u05E9','122':'\u05EA','125':'\u200E','126':'\u200F'};

	// https://encoding.spec.whatwg.org/#error-mode
	var error = function(codePoint, mode) {
		if (mode == 'replacement') {
			return '\uFFFD';
		}
		if (codePoint != null && mode == 'html') {
			return '&#' + codePoint + ';';
		}
		// Else, `mode == 'fatal'`.
		throw Error();
	};

	// https://encoding.spec.whatwg.org/#single-byte-decoder
	var decode = function(input, options) {
		var mode;
		if (options && options.mode) {
			mode = options.mode.toLowerCase();
		}
		// “An error mode […] is either `replacement` (default) or `fatal` for a
		// decoder.”
		if (mode != 'replacement' && mode != 'fatal') {
			mode = 'replacement';
		}
		var length = input.length;
		var index = -1;
		var byteValue;
		var pointer;
		var result = '';
		while (++index < length) {
			byteValue = input.charCodeAt(index);
			// “If `byte` is in the range `0x00` to `0x7F`, return a code point whose
			// value is `byte`.”
			if (byteValue >= 0x00 && byteValue <= 0x7F) {
				result += stringFromCharCode(byteValue);
				continue;
			}
			// “Let `code point` be the index code point for `byte − 0x80` in index
			// `single-byte`.”
			pointer = byteValue - 0x80;
			if (hasOwnProperty.call(INDEX_BY_POINTER, pointer)) {
				// “Return a code point whose value is `code point`.”
				result += INDEX_BY_POINTER[pointer];
			} else {
				// “If `code point` is `null`, return `error`.”
				result += error(null, mode);
			}
		}
		return result;
	};

	// https://encoding.spec.whatwg.org/#single-byte-encoder
	var encode = function(input, options) {
		var mode;
		if (options && options.mode) {
			mode = options.mode.toLowerCase();
		}
		// “An error mode […] is either `fatal` (default) or `HTML` for an
		// encoder.”
		if (mode != 'fatal' && mode != 'html') {
			mode = 'fatal';
		}
		var length = input.length;
		var index = -1;
		var codePoint;
		var pointer;
		var result = '';
		while (++index < length) {
			codePoint = input.charCodeAt(index);
			// “If `code point` is in the range U+0000 to U+007F, return a byte whose
			// value is `code point`.”
			if (codePoint >= 0x00 && codePoint <= 0x7F) {
				result += stringFromCharCode(codePoint);
				continue;
			}
			// “Let `pointer` be the index pointer for `code point` in index
			// `single-byte`.”
			if (hasOwnProperty.call(INDEX_BY_CODE_POINT, codePoint)) {
				pointer = INDEX_BY_CODE_POINT[codePoint];
				// “Return a byte whose value is `pointer + 0x80`.”
				result += stringFromCharCode(pointer + 0x80);
			} else {
				// “If `pointer` is `null`, return `error` with `code point`.”
				result += error(codePoint, mode);
			}
		}
		return result;
	};

	var windows1255 = {
		'encode': encode,
		'decode': decode,
		'labels': [
			'cp1255',
			'windows-1255',
			'x-cp1255'
		],
		'version': '1.0.0'
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return windows1255;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js, io.js or RingoJS v0.8.0+
			freeModule.exports = windows1255;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (var key in windows1255) {
				windows1255.hasOwnProperty(key) && (freeExports[key] = windows1255[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.windows1255 = windows1255;
	}

}(this));

//utf8Decode(String utf8String):String
function utf8Decode(utf8String) {
    var unicodeString = utf8String.replace(
        /[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,
        function(c) {
            var cc = ((c.charCodeAt(0)&0x0f)<<12) | ((c.charCodeAt(1)&0x3f)<<6) | ( c.charCodeAt(2)&0x3f);
            return String.fromCharCode(cc); }
    ).replace(
        /[\u00c0-\u00df][\u0080-\u00bf]/g,
        function(c) {
            var cc = (c.charCodeAt(0)&0x1f)<<6 | c.charCodeAt(1)&0x3f;
            return String.fromCharCode(cc); }
    );
    return unicodeString;
}

var Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function(input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        input = Base64._utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        }
        return output;
    },
    decode: function(input,noutf,win1255) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        if (win1255){
        	noutf=true;
        	output = windows1255.decode(output);
        }
        if (!noutf) output = Base64._utf8_decode(output);
        return output;
    },
    _utf8_encode: function(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
    _utf8_decode: function(utftext) {
        var string = "";
        var i = 0;
        var c1,c2,c3;
        var c = c1 = c2 = c3 = 0;
        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
}

function decodeVCard(vcard){
	var spl=vcard.split(regNL);
	var vcardobj={};
	for(var i=0;i<spl.length;i++){
		var line=spl[i];
		if (!line)continue;
		var sep=line.indexOf(':');
		if (sep){
			var field=line.substr(0,sep);
			var val=line.substr(sep+1);
			var fspl=field.split(';');
			var f=fspl[0];
			var vobj={V:val};
			for(var j=1;j<fspl.length;j++){
				var fv=fspl[j];
				var fvspl=fv.split('=');
				vobj[fvspl[0]]=fvspl[1];
			}
			vcardobj[f]=vobj;
		}
	}
	
	return vcardobj;
}

function decodeUTFHeaderVal(v){
	var subjv=v;
	var maxwh=64;
	while(true){
		try{
			var l=subjv.toLowerCase();
			var ind=l.indexOf('=?utf-8?');
			if (ind>=0){
				var eind=l.indexOf('?=',ind+10);
				var dsubjv='';
				var newsubjv='';
				if (ind>0)newsubjv+=subjv.substr(0,ind);
				dsubjv=subjv.substring(ind+8,eind);
				var f=false;
				if (dsubjv.toLowerCase().charAt(0)=='b'){
					dsubjv=dsubjv.substr(2);
					dsubjv=base64_decode_(dsubjv);
					f=true;
				} else if (dsubjv.toLowerCase().charAt(0)=='q'){
					dsubjv=dsubjv.substr(2);
					dsubjv=dsubjv.split('_').join(' ');
					dsubjv=utf8Decode(quoted_printable_decode(dsubjv));
					f=true;
				}
				newsubjv=newsubjv+dsubjv+subjv.substr(eind+2);
				subjv=newsubjv;
				if (!f)break;
			}
			maxwh--;
			if (maxwh==0)break;
		} catch (e){
			subjv=v;
			break;
		}
	}
	return subjv;
}
function decodeCP1255HeaderVal(v){
	var subjv=v;
	var maxwh=64;
	while(true){
		try{
			var l=subjv.toLowerCase();
			var ind=l.indexOf('=?windows-1255?');
			if (ind>=0){
				var eind=l.indexOf('?=',ind+17);
				var dsubjv='';
				var newsubjv='';
				if (ind>0)newsubjv+=subjv.substr(0,ind);
				dsubjv=subjv.substring(ind+15,eind);
				var f=false;
				if (dsubjv.toLowerCase().charAt(0)=='b'){
					dsubjv=dsubjv.substr(2);
					dsubjv=base64_decode_(dsubjv,false,true);
					f=true;
				} else if (dsubjv.toLowerCase().charAt(0)=='q'){
					dsubjv=dsubjv.substr(2);
					dsubjv=dsubjv.split('_').join(' ');
					dsubjv=windows1255.decode(quoted_printable_decode(dsubjv));
					f=true;
				}
				newsubjv=newsubjv+dsubjv+subjv.substr(eind+2);
				subjv=newsubjv;
				if (!f)break;
			}
			maxwh--;
			if (maxwh==0)break;
		} catch (e){
			subjv=v;
			break;
		}
	}
	return subjv;
}
function decodeMixedHeaderVal(v){
	v=decodeUTFHeaderVal(v);
	v=decodeCP1255HeaderVal(v);
	return v;
}

/**
* MIME EXTRACTION
**/

//isPGPTxt(String txt) : Boolean - tests text for both pgp headers
function isPGPTxt(txt){
	if (txt && txt.indexOf(ECClientCFG.pgpPrefix)>=0 && txt.indexOf(ECClientCFG.pgpSuffix)>=0){
		return true;
	}
	return false;
}

//testDisplayTxt(String data) : String - returns display txt if any without spaces and tags
function testDisplayTxt(data){
	if (!data)return '';
	var dataRig=data.split('\n').join('');
	dataRig=dataRig.split('\r').join('');
	dataRig=dataRig.split(regWS).join('');
	var ftxt='';
	try{
		ftxt=$('<div>'+dataRig+'</div>').text();
	} catch(e){
		ftxt='';
		try{
			ftxt=$('<div>'+data+'</div>').text();
		} catch(e){
			ftxt='';
		}
	}
	return ftxt;
}

//mergeMimeParts(Object extractMimeParts p1,Object extractMimeParts p2) : Object extractMimeParts 
function mergeMimeParts(p1, p2, nop2content, nop2headers){
	if (!p1)return p2;
	if (!p2)return p1;
	var newmimeparts={content:[]};
	var key;
	var i;
	if (!nop2content)for(key in p2.content)newmimeparts.content[key]=p2.content[key];
	else {
		if (p2.content.attachments){
			newmimeparts.content.attachments=p2.content.attachments;
			for(i=0;i<p2.content.attachments.length;i++){
				newmimeparts.content[p2.content.attachments[i]]=p2.content[p2.content.attachments[i]];
				newmimeparts.content[p2.content.attachments[i]+'_headers']=p2.content[p2.content.attachments[i]+'_headers'];
			}
		}
		if (p2.content.images){
			newmimeparts.content.images=p2.content.images;
			for(i=0;i<p2.content.images.length;i++){
				newmimeparts.content[p2.content.images[i]]=p2.content[p2.content.images[i]];
				newmimeparts.content[p2.content.images[i]+'_headers']=p2.content[p2.content.images[i]+'_headers'];
			}
		}
	}
	for(key in p1.content){
		if (!newmimeparts.content[key])newmimeparts.content[key]=p1.content[key];
	}
	if (!nop2headers)newmimeparts.headers=p2.headers.concat(p1.headers);
	else newmimeparts.headers=p1.headers;
	if (p2.content.images && p1.content.images){
		newmimeparts.content.images=p2.content.images.concat(p1.content.images);
		for(i=0;i<p1.content.images.length;i++){
			newmimeparts.content[p1.content.images[i]]=p1.content[p1.content.images[i]];
			newmimeparts.content[p1.content.images[i]+'_headers']=p1.content[p1.content.images[i]+'_headers'];
		}
	}
	if (p2.content.attachments && p1.content.attachments){
		newmimeparts.content.attachments=p2.content.attachments.concat(p1.content.attachments);
		for(i=0;i<p1.content.attachments.length;i++){
			newmimeparts.content[p1.content.attachments[i]]=p1.content[p1.content.attachments[i]];
			newmimeparts.content[p1.content.attachments[i]+'_headers']=p1.content[p1.content.attachments[i]+'_headers'];
		}
	}
	if (ECClientCFG.debugMimeExt)log(p1, p2,newmimeparts);
	return newmimeparts;
}

//filterDecryptContent(val, asHtml, mode) : Object {s1: String, s2: String, val: String, oval:Array, di:Array, q:String, qb:Array, nonblocking:Bool, fractalized:Bool};
function filterDecryptContent(val, asHtml, mode) {
	var s1 = ECClientCFG.pgpPrefix;
	var s2 = ECClientCFG.pgpSuffix;
	var quote = '> ';
	var valSplt = [];
	var newVal = [];
	var decryptIndex = [];
	var quotedBlocks = [];
	var i, j = 0;
	var res = {s1: s1, s2: s2, val: newVal, oval:[], di: decryptIndex, q: quote, qb: quotedBlocks, nonblocking:false, fractalized:false};
	var v;
	var vSplt;
	var quoted;
	
	valSplt = val.split(s1);
	newVal[0] = valSplt[0];
	
	if (ECClientCFG.nonblockingPGP){
		var ftxt=testDisplayTxt(newVal[0]);
		if (ftxt.split('>').join('')){
			res.nonblocking=true;
			return res;
		}
	}
	
	for (i = 1; i < valSplt.length; i++) {
		v = valSplt[i];
		vSplt = v.split(s2);
		if (vSplt.length>1){
			decryptIndex.push(newVal.length);
			quoted = vSplt[0];
			
			var addblockquote=false;
			if (quoted.indexOf(quote) >= 0) {
				var splitfval=newVal[i-1].split('\n');
				if (testDisplayTxt(splitfval[splitfval.length-1])=='>'){
					splitfval[splitfval.length-1]='<blockquote>';
					newVal[i-1]=splitfval.join('\n');
					addblockquote=true;
					quotedBlocks.push(newVal.length);
				}
			}
			
			var unquoted = quoted;
			if (addblockquote)unquoted = quoted.split(quote).join('');
			res.oval[i]=unquoted;
			if (asHtml){
				if (mode=='input'){
					unquoted=unquoted.split(/<br\s*\/?>/).join('\n');
				}
				else {
					
				}
				
				var ounquoted=unquoted;
				unquoted=ounquoted.replace(/<(?:.|\s)*?>/g, "");
				if (ounquoted.split(regNL).length<2){
					var reconstructPGP=$('<div></div>');
					reconstructPGP.html(ounquoted);
					$('br',reconstructPGP).each(function(){
						$(this).after('<br>')
						$(this).remove();
					});
					unquoted=reconstructPGP.html();
					unquoted=unquoted.split(/<br\s*\/?>/).join('\n');
					reconstructPGP.html(unquoted);
					unquoted=reconstructPGP.text();
				}
				
				var packed=unquoted;
				packed=packString(unquoted, true);
				
				var unpacked=packed.split(regNL);
				var newpack=[];
				for(var u=0;u<unpacked.length;u++){
					var unp=unpacked[u];
					if (getHeader(unp,u,u) || !unp.split(regWS).join(''))continue;
					newpack[newpack.length]=unp;
				}
				packed='\n'+newpack.join('\n');
				unquoted='\n'+packed+'\n';
				
			} else {
				
			}
			newVal.push(s1 + unquoted + s2);
			if (addblockquote) newVal.push('</blockquote>');
	
			for (j = 1; j < vSplt.length; j++) {
				newVal.push(vSplt[j]);
			}
		} else {
			newVal.push(v);
		}
	}
	
	if (ECClientCFG.debugDecryptExt) log(val,asHtml,res)
	return res;
}

function secureAttributes(jD){
	jD.find('*').each(function(){
		var t=$(this);
		var attr=t[0].attributes;
		var attrar=[];
		for(var i=0;i<attr.length;i++)attrar[i]=attr[i].name;
		for(i=0;i<attrar.length;i++){
			if (ECClientCFG.safeAttributeNames.indexOf(attrar[i].toLowerCase())<0)t[0].removeAttribute(attrar[i]);
		}
		var href=t.attr('href');
		if (href && href.toLowerCase().indexOf('javascript:')==0)t.removeAttr('href');
	});
}

//convertImgs(String html) : Object {html:String, imgs:Array, ids:Array}
//converts html imgs of src type data: to an array of objects {type:String,enc:String,data:String,cid:String,name:String}  name can be generated using ext of file
function convertImgs(html){
	var imgs={};
	var ids=[];
	var jD=$('<div>');
	jD.append(html);
	if (ECClientCFG.secureAttributes) secureAttributes(jD);
	$('img', jD).each(function(){
		var img=$(this);
		img.load(function(e){
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		})
		img.error(function(e){
			e.preventDefault();
			e.stopImmediatePropagation();
			return false;
		})
		var src=img.attr('src') || '';
		var cid=null;
		if (src.toLowerCase().indexOf('cid:')==0){
			cid=src.substr(4);
			imgs[cid]=true;
			ids.push(cid);
		}
		else if (src.toLowerCase().indexOf('data:')==0){
			var idata=src.substr(5);
			var ind1=idata.indexOf(';');
			var itype=null;
			var ienc=null;
			if (ind1){
				itype=idata.substr(0,ind1);
				idata=idata.substr(ind1+1);
				ind1=idata.indexOf(',');
				if (ind1){
					ienc=idata.substr(0,ind1);
					idata=idata.substr(ind1+1);
				}
			}
			if (!itype) itype='images/png';
			if (!ienc) ienc='base64';
			cid=generateBoundary();
			name=cid+'.'+itype.split('/')[1];
			img.attr('src','cid:'+cid);
			ids.push(cid);
			imgs[cid]={type:itype,enc:ienc,data:idata,cid:cid,name:name};
		}
	});
	html=jD.html();
	return {html:html,imgs:imgs,ids:ids};
}
//generateEmbedImgMimePart(Object convertImgs imgData) : String
function generateEmbedImgMimePart(imgData){
	var ctype='Content-Type: '+imgData.type+'; name="'+imgData.name+'"';
	var cenc='Content-Transfer-Encoding: '+imgData.enc;
	var cid='Content-ID: <'+imgData.cid+'>';
	var cdis='Content-Disposition: inline; filename="'+imgData.name+'"';
	var d=imgData.data;
	return ctype+'\n'+cenc+'\n'+cid+'\n'+cdis+'\n\n'+splitInLines(d, ECClientCFG.splitInLinesChars).join('\n');
}
//getRelatedParts(String emailBody) : Object {c:String,r:Array}
//extracts related parts - embed imgs with ids from html content using convertImgs(emailBody)
function getRelatedParts(emailBody){
	var cids=convertImgs(emailBody);
	var relateParts=null;
	emailBody=cids.html;
	if (cids.ids.length>0){
		relateParts=[];
		for(var ic=0;ic<cids.ids.length;ic++){
			relateParts.push(generateEmbedImgMimePart(cids.imgs[cids.ids[ic]]));
		}
	}
	return {c:emailBody,r:relateParts};
}

//getMimeContent(Object extractMimeParts mimeParts, String mode, Object decodeMimeHeader encHeader, Object decodeMimeHeader cntHeader) : Object { content:String, type:String }
function getMimeContent(mimeParts, mode, encHeader, cntHeader){
	if (mimeParts && mimeParts.headers.length > 0 && mimeParts.content.length > 0){
		var ctypes=trueContentTypes.concat();
		if (!ECClientCFG.htmlFormat){
			var htmlIndex=ctypes.indexOf('text/html');
			ctypes.splice(htmlIndex, 1);
			ctypes.splice(ctypes.indexOf('text/plain')+1,0,'text/html');
		}
		for(var i=0;i<ctypes.length;i++){
			var type=ctypes[i];
			if (mimeParts.content[type]){
				var type=ctypes[i];
				var cnt=mimeParts.content[type];
				var head=mimeParts.content[type+'_headers'];
				var enc=head ? getHeaderByType(head, 'Content-Transfer-Encoding') : null;
				if (!enc)enc=encHeader;
				var cnth=head ? getHeaderByType(head, 'Content-Type') : null;
				if (!cnth)cnth=cntHeader;
				var charset=cnth && cnth.params.charset ? cnth && cnth.params.charset.toLowerCase() : null;
				if (enc && enc.params[''].toLowerCase()=='quoted-printable'){
					cnt=quoted_printable_decode_(cnt, type.indexOf('html')>=0);
				}
				else if (enc && enc.params[''].toLowerCase()=='8bit'){
					if (!ECClientCFG.enforceQuotedPrintable) cnt=_8bit_decode_(cnt, type.indexOf('html')>=0, isPGPTxt(cnt.join('')) && mode=='input'?'\n':'', charset=='windows-1255');
					else cnt=quoted_printable_decode_(cnt, type.indexOf('html')>=0);
				}
				else if (enc && enc.params[''].toLowerCase()=='base64'){
					cnt=base64_decode_(cnt, type.indexOf('html')>=0,charset=='windows-1255');
				}
				else {
					if (!ECClientCFG.enforceQuotedPrintable) cnt=cnt.join(NL);
					else cnt=quoted_printable_decode_(cnt, type.indexOf('html')>=0);
				}
				
				return {content:cnt, type:type};
			}
		}
	}
	return null;
}
//extractMimeParts (String $val) : Object { content:[], headers:[], lines:[], parts:[] }
//content - images, attachments, array index of content types, keys of each contenttype, keys of each image/attachment by id + headers
function extractMimeParts($val) {
	var lines=$val.split(regNL);
	var content=[];
	var parts=[];
	var headers=extractHeaders(lines);
	if (headers.length>0){
		extractMimeContent(lines, headers, content, parts);
	}
	if (!ECClientCFG.mime.keepLines) lines=[];
	return { content:content, headers:headers, lines:lines, parts:parts };
}
//extractHeaders(Array lines) : Array of getHeader decodeMimeHeader objects 
//extracts all headers from lines array using getHeader function respecting multiline headers
function extractHeaders(lines){
	var headers=[];
	for(var i=0;i<lines.length;i++){
		var line=lines[i];
		var oline=line;
		var oi=i;
		var mimeHeader=getHeader(line, i, i);
		var omimeHeader=mimeHeader;
		if (mimeHeader) {
			var initIndex=mimeHeader.lineIndex;
			for(var j=i+1;j<lines.length;j++){
				var nline=lines[j];
				if (!nline || nline.split(regWS).join('').length==0 || getHeader(nline, initIndex, j)) {
					break;
				} else {
					line+=nline;
					mimeHeader=getHeader(line, initIndex, j);
					i++;
					if (line.length>ECClientCFG.maxMimeHeaderLineChar){
						line=oline;
						i=oi;
						mimeHeader=omimeHeader;
						break;
					}
				}
			}
			headers.push(mimeHeader);
		}
	}
	return headers;
}
//getHeaderByMimeType(String line, int lineIndex, int endIndex) : Object decodeMimeHeader
//extracts headers based on mimeTypes
function getHeaderByMimeType(line, lineIndex, endIndex){
	var ht;
	var mimeHeader;
	for(var j=0;j<mimeTypes.length;j++){
		ht=mimeTypes[j]+':';
		var headerIndex=line.toLowerCase().indexOf(ht.toLowerCase());
		if (headerIndex==0){
			mimeHeader=decodeMimeHeader(ht, line);
			mimeHeader.lineIndex=lineIndex;
			mimeHeader.endIndex=endIndex;
			return mimeHeader;
		}
	}
	return null;
}
//function getHeader(String line, int lineIndex, int endIndex) : Object decodeMimeHeader
//extracts all types of headers according to template
function getHeader(line, lineIndex, endIndex){
	var fc=line.charAt(0);
	var forbiddenChars='\'"()<>@,;:\\\/[]?={} \t';
	if (forbiddenChars.indexOf(fc)>=0) { return null; }
	var ht;
	var mimeHeader;
	var cursorIndex=line.indexOf(':');
	if (cursorIndex>=1){
		ht=line.substr(0,cursorIndex);
		for(var i=0;i<ht.length;i++){
			if (forbiddenChars.indexOf(ht.charAt(i))>=0) { return null; }
		}
		mimeHeader=decodeMimeHeader(ht+':', line);
		mimeHeader.lineIndex=lineIndex;
		mimeHeader.endIndex=endIndex;
		return mimeHeader;
	}

	return null;
}
//decodeMimeHeader (String $header, String $val) : Object { val:String, params:Object, paramsVal:String, type:String }
function decodeMimeHeader ($header, $val){
	var mimeHeader={val:$val};
	mimeHeader.type=$header.split(':')[0];
	mimeHeader.paramsVal=$val.substr($header.length);
	mimeHeader.params={};
	var params=mimeHeader.paramsVal.split(regWS).join('').split(';');
	for(var p=0;p<params.length;p++){
		var pp=params[p];
		var eqind=pp.indexOf('=');
		var pname=pp.substr(0,eqind);
		var pv=pp.substr(eqind+1);
		if (pv){ pv=pv.split(regQ).join(''); }
		if (pv || pname){
			mimeHeader.params[pname]=pv;
		}
	}
	if (ECClientCFG.debugMime)log('decodeMimeHeader',mimeHeader);
	return mimeHeader;
}
//detectMimeBoundary(Array lines, String $boundary, int index=0) : int
//searches for boundary ignoring spaces in boundary line from start index, returns index of boundary line
function detectMimeBoundary(lines, $boundary, index){
	if (!index) { index=0; }
	for(var i=index;i<lines.length;i++){
		var line=lines[i].split(' ').join('');
		if (line==$boundary) { return i; }
	}
	return -1;
}
//packMimeContent(Array lines, int obi, int coi) : Array
//extracts content lines based on open/closed boundary index from lines array
function packMimeContent(lines, obi, coi){
	var newlines=[];
	if (coi==-1){coi=lines.length;}
	for(var i=obi+1;i<coi;i++){
		var line=lines[i];
		newlines.push(line);
	}
	if (ECClientCFG.debugMimeExt)log('packMimeContent')
	if (ECClientCFG.debugMimeExt)log(newlines)
	return newlines;
}

//getNextContentHeaderIndex (Array headers, int lineIndex) : int
function getNextContentHeaderIndex(headers, lineIndex){
	for(var i=0;i<headers.length;i++){
		if (headers[i].lineIndex>=lineIndex && headers[i].params[''] && headers[i].type.toLowerCase()=='content-type' && (!ECClientCFG.strictContent || contentTypes.indexOf(headers[i].params[''].toLowerCase())>=0 ) ){
			return i;
		}
	}
	return -1;
}
//getHeaderByType(Array headers, String type) : Object
function getHeaderByType(headers, type){
	if (!headers) return null;
	type=type.toLowerCase();
	for(var i=0;i<headers.length;i++){
		if (headers[i].type.toLowerCase()==type){
			return headers[i];
		}
	}
	return null;
}
//clearHeaders(Array cnt) : Object { cnt:Array , h:Array } 
//removes all headers detecting them with getHeaderByMimeType and respecting multiline headers
//extracted object contains the new content without headers and cleared headers in an array
function clearHeaders(cnt){
	var cntLines=[];
	var headers=[];
	var readHeaders=true;
	var readContent=false;
	for(var i=0;i<cnt.length;i++){
		var line=cnt[i];
		var oline=line;
		var oi=i;
		var mimeHeader=null;
		if (readHeaders){
			mimeHeader=getHeaderByMimeType(line, i, i);
			var omimeHeader=omimeHeader;
			if (mimeHeader) {
				var initIndex=mimeHeader.lineIndex;
				for(var j=i+1;j<cnt.length;j++){
					var nline=cnt[j];
					if (!nline || nline.split(regWS).join('').length==0 || getHeaderByMimeType(nline, initIndex, j)) {
						break;
					}
					else {
						if (getHeader(nline, initIndex,j)){
							break;
						} else {
							line+=nline;
							mimeHeader=getHeaderByMimeType(line, initIndex, j);
							i++;
							
							if (line.length>ECClientCFG.maxMimeHeaderLineChar){
								line=oline;
								i=oi;
								mimeHeader=omimeHeader;
								break;
							}
						}
					}
				}
			} else if (line) {
				continue;
			}
		}
		if (!mimeHeader){
			if (readHeaders){
				readHeaders=false;
				if (line) cntLines.push(line);
			}
			else {
				cntLines.push(line);
			}
		}
		else {
			headers.push(mimeHeader);
		}
	}
	return {cnt:cntLines,h:headers};
}
//extractMimeContent(Array lines, Array headers, Array content, Array parts, int fromIndex, int toIndex, String boundary, String type, int maxIndex) : void
//recursive function, linear/continuous/indepth/reverting/fractal parsing from top to bottom
function extractMimeContent(lines, headers, content, parts, fromIndex, toIndex, boundary, type, maxIndex){
	if (ECClientCFG.debugMimeExt) log('extractMimeContent','info',boundary, type, fromIndex, toIndex);
	if ((!fromIndex && fromIndex!==0) || fromIndex<0){ fromIndex=-1; }
	if (!maxIndex || maxIndex<0) { maxIndex=lines.length; }
	if (!toIndex || toIndex<0) { toIndex=maxIndex; }
	var hi=getNextContentHeaderIndex(headers, fromIndex);
	if (hi<0 || (toIndex!=-1 && hi>toIndex) ) { return; }
	var mainH=headers[hi];
	var mainHVar=mainH.params[''];
	var b=mainH.params.boundary || boundary;
	var ob=openBoundary(b);
	var co=closeBoundary(b);
	var obi=detectMimeBoundary(lines, ob, Math.min(mainH.endIndex, fromIndex)+1);
	var part=null;
	if (ECClientCFG.debugMimeExt) log('extractMimeContent','info',mainHVar)
	
	if (obi!=-1){
		var coi=detectMimeBoundary(lines, co, obi+1);
		if (ECClientCFG.debugMime) log('extractMimeContent 2',fromIndex, toIndex, ob, co, obi, coi, maxIndex, boundary, mainH, type);
		var part=null;
		if (ECClientCFG.mime.keepParts){
			part=packMimeContent(lines, obi, coi);
			parts.push({part:part, start:obi+1, end:coi});
		}
		part=packMimeContent(lines, fromIndex, obi);
		if (ECClientCFG.mime.keepParts){
			parts.push({part:part, start:fromIndex+1, end:obi});
		}
		pushContent(mainH, content, part);
		extractMimeContent(lines, headers, content, parts, obi, coi, b, mainH, maxIndex);
		if (b!=boundary && coi>0){
			extractMimeContent(lines, headers, content, parts, coi, 0, boundary, type, maxIndex);
		}
	}
	else {
		if (ECClientCFG.debugMime) log('extractMimeContent',fromIndex, toIndex, ob, co, obi, -1, maxIndex, boundary, mainH, type);
		part=packMimeContent(lines, fromIndex, toIndex);
		pushContent(mainH, content, part);
	}
}
//isTrueContent(String mainHVar) : Boolean
function isTrueContent(mainHVar){ if ( trueContentTypes.indexOf(mainHVar.toLowerCase())>=0 ){ return true; } return false; }
//isImgContent(String mainHVar) : Boolean
function isImgContent(mainHVar){ if ( imgContentTypes.indexOf(mainHVar.toLowerCase())>=0 ){ return true; } return false; }
//pushContent(String mainH, Array content, Array part) : Array
function pushContent(mainH, content, part){
	var clP=clearHeaders(part);
	var cnt=clP.cnt;
	var cnth=getHeaderByType(clP.h, 'Content-Type');
	if (!cnth) return null;
	var cnthv=cnth.params[''];
	var cidh=getHeaderByType(clP.h, 'Content-ID');
	var cdh=getHeaderByType(clP.h, 'Content-Disposition');
	var encryptedNames=["encrypted.asc"];
	var signatureNames=["signature.asc"];
	var cdhn=cdh ? cdh.params.name || cdh.params.filename : null;
	if (cdh && cdh.params[''].toLowerCase()=='attachment' && encryptedNames.indexOf(cdhn)<0){
		var name=cdh.params['filename'] || cnth.params['name'] || cnthv;
		name=decodeURIComponent(name);
		var aid='attachment_'+name+'_'+generateBoundary();
		if (!content.attachments)content.attachments=[];
		content.attachments.push(aid);
		content[aid+'_headers']=clP.h;
		content[aid]=cnt;
		
		if (cidh && ECClientCFG.multiCIDAttachmentImages && isImgContent(cnthv)){
			var cid=cidh ? cidh.params[''] : cnthv;
			var imgid='image_'+cid;
			if (!content.images)content.images=[];
			content.images.push(imgid);
			content[imgid+'_headers']=clP.h;
			content[imgid]=cnt;
		}
		
		return content[aid];
	}
	else if (isTrueContent(cnthv)){
		content.push(cnthv);
		content[cnthv+'_headers']=clP.h;
		content[cnthv]=cnt;
		return content[cnthv];
	}
	else if (isImgContent(cnthv)){
		var cid=cidh ? cidh.params[''] : cnthv;
		var imgid='image_'+cid;
		if (!content.images)content.images=[];
		content.images.push(imgid);
		content[imgid+'_headers']=clP.h;
		content[imgid]=cnt;
		return content[imgid];
	}
	
	return null;
}
//pushTrueContent(String mainHVar, Array content, Array part) : Array 
//clears headers from part, assigns types and headers to content, returns new content without headers
function pushTrueContent(mainHVar, content, part){
	var clP=clearHeaders(part);
	content.push(mainHVar);
	var cnt=clP.cnt;
	content[mainHVar+'_headers']=clP.h;
	content[mainHVar]=cnt;
	return content[mainHVar];
}
//pushImgContent(String mainHVar, Array content, Array part) : Array 
//clears headers from part, assigns types and headers to content according to Content-ID header if any, returns new content without headers
function pushImgContent(mainHVar, content, part){
	var clP=clearHeaders(part);
	var cnt=clP.cnt;
	var cidh=getHeaderByType(clP.h, 'Content-ID');
	var cid=cidh ? cidh.params[''] : mainHVar;
	var imgid='image_'+cid;
	content[imgid+'_headers']=clP.h;
	content[imgid]=cnt;
	return content[imgid];
}
//wrapMimeBody(String cnt, String html, Array htmlRelate, Array attachments, Bool skipaltheader, Bool skipmixheader) : Object { body:String, ab:String, mb:String, altheader:String, mixheader:String }
function wrapMimeBody(cnt, html, htmlRelate, attachments, skipaltheader, skipmixheader){
	var newcnt='';
	var b1=generateBoundary();
	var b2=generateBoundary();
	var inline=!cnt || !html;
	var altheader=ECClientCFG.templates['cnt-alt'].replace('%B%', b1);
	var mixheader=ECClientCFG.templates['cnt-mix'].replace('%B%', b2);
	if (!inline) newcnt+=skipaltheader ? '' : altheader+NL+NL;
	if (cnt) {
		if (!inline) newcnt+=openBoundary(b1)+NL;
		newcnt+=ECClientCFG.templates['cnt-txt']+NL;
		if (cnt===true)cnt='';
		newcnt+=(ECClientCFG.enforceQuotedPrintable ? ECClientCFG.templates['cnt-tr-encQ'] : ECClientCFG.templates['cnt-tr-enc'])+NL;
		newcnt+=NL+(!ECClientCFG.enforceQuotedPrintable || !ECClientCFG.encodeQuotedPrintable ? cnt : quoted_printable_encode(cnt))+NL+NL;
	}
	if (html) {
		if (!inline) newcnt+=openBoundary(b1)+NL
		var nhtml=ECClientCFG.templates['cnt-html']+NL;
		nhtml+=(ECClientCFG.enforceQuotedPrintable ? ECClientCFG.templates['cnt-tr-encQ'] : ECClientCFG.templates['cnt-tr-enc'])+NL;
		nhtml+=NL+(!ECClientCFG.enforceQuotedPrintable || !ECClientCFG.encodeQuotedPrintable ? html : quoted_printable_encode(html));
		if (htmlRelate){
			newcnt+=relateMimeParts([nhtml].concat(htmlRelate))+NL+NL;
		}
		else {
			newcnt+=nhtml+NL+NL;
		}
	}
	if (!inline) newcnt+=closeBoundary(b1)+NL;
	
	if (attachments && attachments.length){
		var abody='';
		for(var a=0;a<attachments.length;a++){
			var att=attachments[a];
			var file=att.file;
			var type=att.type2 || att.type || file.type;
			var name=att.name2 || att.name || file.name;
			if (!type)type='application/octet-stream';
			if (!name)name='attachment'+a;
			else {
				if (name.length>ECClientCFG.trimAttachmentNames){
					var ext=name.split('.');
					if (ext.length>1){
						var lastext=ext.pop().toLowerCase();
						name=ext.join('.').substr(0,Math.max(1, ECClientCFG.trimAttachmentNames-(lastext.length+1)));
						name+='.'+lastext;
					}
				}
				var isutfenc=false;
				var namel=name.length;
				name=encodeURIComponent(name);
				if (namel!=name.length)isutfenc=true;
			}
			var b64=base64_encode(att.data2 || att.data);
			b64=splitInLines(b64, ECClientCFG.splitInLinesChars).join('\n');
			abody+=openBoundary(b2)+ 
				NL+'Content-Type: '+type+'; name="'+name+'"'+NL+
				'Content-Transfer-Encoding: base64'+NL+
				'Content-Disposition: attachment; filename'+(isutfenc ? "*=\"UTF-8''" : "=\"")+name+'"'+NL+
				NL+b64+NL;
		}
		newcnt=(skipmixheader ? '' : mixheader+NL+NL)+
			openBoundary(b2)+
			NL+newcnt+
			(!inline ? NL+NL : '')+
			abody+NL+
			closeBoundary(b2)+NL;
	}

	return {body:newcnt, ab:b1, mb:b2, altheader:altheader, mixheader:mixheader};
}
//relateMimeParts(Array parts) : String
//generates boundary in multipart/related mime part, concats all parts inside and closes boundary
function relateMimeParts(parts){
	var newcnt='';
	var b1=generateBoundary();
	var ctype='Content-Type: multipart/related; boundary="'+b1+'"';
	newcnt=ctype+'\n\n\n'+openBoundary(b1)+'\n'+parts.join('\n'+openBoundary(b1)+'\n')+'\n'+closeBoundary(b1);
	return newcnt;
}