<?php

/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

class EC_PGP_MIME {
	
	public $lastId=null;
	public $lastBoundary=null;
	public $lastHeader=null;
	public $data=array();
	public $content=null;
	public $headers=array();
	public $parts=array();
	public $boundaries=array();
	public $index=array();
	public $boundPrefix='--%B%';
	public $boundSuffix='--%B%--';
	public $htmlPrefix='<html><body>';
	public $htmlSuffix='</body></html>';
	public $pgpPrefix='-----BEGIN PGP MESSAGE-----';
	public $pgpSuffix='-----END PGP MESSAGE-----';
	public $randomChar='qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM0987654321';
	
	public $headerTypes=array(
		'app-pgp'=>'application/pgp-encrypted',
		'mp-enc'=>'multipart/encrypted; protocol="application/pgp-encrypted"',
		'txt'=>'text/html; charset="utf-8"',
		'txt-pl'=>'text/plain; charset="utf-8"',
		'app-enc'=>'application/octet-stream; name="%ENC_NAME%"',
		'mixed'=>'multipart/mixed',
		'mixed-bound'=>'multipart/mixed; boundary="%B%"',
		'rel-bound'=>'multipart/related; boundary="%B%"',
		'alt-bound'=>'multipart/alternative; boundary="%B%"',
		'cnt-dis'=>'inline; filename="%ENC_NAME%"',
		'cnt-tr-enc-def'=>'quoted-printable',
		'cnt-tr-enc-64'=>'base64',
		'cnt-desc-pgp-v'=>'PGP/MIME version identification',
		'cnt-desc-php'=>'OpenPGP encrypted message',
		'eol'=>'\r\n'
	);
	
	public function __construct () {
		
		
		$this->init();
	}
	
	protected function init () {
		
		
	}
	
	public function setContent($content) {
		$this->content=$content;
	}

	public function getContent() {
		return $this->content;
	}
	
	public function getId () {
		$id='';
		$this->lastId=$id;
		return $id;
	}
	
	public function getContentWrapper ($content=null) {
		if (!$content) {
			$content=$this->content;
		}
		return $this->genHTMLPrefix().$this->getNL().$content.$this->getNL().$this->genHTMLSuffix();
	}
	
	public function getNL() {
		return PHP_EOL;
	}
	
	public function getVersion ($v, $mime=false) {
		$pr='';
		if($mime) { $pr='MIME-'; }
		return $pr.'Version: '.$v;
	}
	
	public function genContentType ($type, $meta=null) {
		return $this->getHeader('Content-Type', $this->headerTypes[$type], $meta);
	}
	
	public function genContentTransfer ($type) {
		return $this->getHeader('Content-Transfer-Encoding', $this->headerTypes['cnt-tr-enc-'.$type]);
	}
	
	public function genContentDescription ($type) {
		return $this->getHeader('Content-Description', $this->headerTypes['cnt-desc-'.$type]);
	}
	
	public function genContentDisposition ($name) {
		return $this->getHeader('Content-Disposition', str_replace('%ENC_NAME%', $name, $this->headerTypes['cnt-dis']));
	}
	
	public function getHeader ($type, $value, $meta=null) {
		$header=$type.': '.$value.($meta!=null ? '; '.$meta : '');
		$this->lastHeader=$header;
		array_push($this->headers, $header);
		return $header;
	}
	
	public function genHeaders () {
	
	}
	
	public function genHTMLPrefix () {
		return $this->htmlPrefix;
	}
	
	public function genHTMLSuffix () {
		return $this->htmlSuffix;
	}
	
	public function encodeText ($text) {
		$enc=base64_encode($text);
		return $enc;
	}
	
	public function encodeIMG ($filename, $filetype) {
		return 'data:image/' . $filetype . ';base64,' . $this->encodeFile($filename);
	}
	
	public function encodeBinary (&$bin) {
		return base64_encode($bin);
	}
	
	public function encodeAttachment (&$attachment) {
		
		
	}
	
	public function encodeFile ($filename) {
		$binary = fread(fopen($filename, "r"), filesize($filename));
		return $this->encodeBinary($binary);
	}
	
	public function encodeFileChunk ($input_file, $output_file) {
		$readCount=57 * 143;
		while(!feof($input_file))
		{
			$plain = fread($input_file, $readCount);
			$encoded = base64_encode($plain);
			$encoded = chunk_split($encoded, 76, "\r\n");
			fwrite($output_file, $encoded);
		}
	}
	
	public function getBoundary ($b=null) {
		if (!$b){
			$b=$this->lastBoundary;
		}
		return 'boundary="'.$b.'"';
	}
	
	public function genBoundary () {
		//$b='--='.$this->randomStr(6).'-'.$this->randomStr(4).'-'.$this->randomStr(4).'-'.$this->randomStr(4).'-'.$this->randomStr(12);
		$b=$this->randomStr(6).'-'.$this->randomStr(4).'-'.$this->randomStr(4).'-'.$this->randomStr(4).'-'.$this->randomStr(12);
		$this->lastBoundary=$b;
		array_push($this->boundaries, $b);
		return $b;
	}
	
	public function openBoundary ($b) {
		return str_replace('%B%', $b, $this->boundPrefix);
	}
	
	public function closeBoundary ($b) {
		return str_replace('%B%', $b, $this->boundSuffix);
	}
	
	public function encode () {
		
	}
	
	public function decode () {
		
	}
	
	public function packMIME ($mime, $data=null, $options=null) {
		
	}
	
	public function unpackMIME ($mime) {
		
	}
	
	public function randomStr($l) {
		$s='';
		$c=strlen($this->randomChar);
		for($i=0;$i<$l;$i++){
			$ci=rand(0,$c);
			$ch=substr($this->randomChar, $ci, 1);
			$s.=$ch;
		}
		return $s;
	}
	
}


