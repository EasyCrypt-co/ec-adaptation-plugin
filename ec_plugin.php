<?php

/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

use function GuzzleHttp\json_encode;

require_once('vendor/pear-pear.php.net/Mail_Mime/Mail/mime.php');
require_once('ec_pgp_mime.php');

class ec_plugin extends rcube_plugin
{
    /**
     * @var rcmail
     */
    public $RCMAIL;

    public $task = 'mail|settings|addressbook';

    public $enableMimeFormat = true;
	public $deliverSource=true;
    
    const PGP_MIME_CTYPE = "multipart/encrypted";
    const PGP_MIME_CTYPE_PGP = "application/pgp-encrypted";
    const MULTIPART_MIME = "multipart/mixed";
    const INLINE_PGP_PREFIX = "-----BEGIN PGP MESSAGE-----";
    const INLINE_PGP_SUFFIX = "-----END PGP MESSAGE-----";
    
    const RECENT_ADDRESS_ID = "collected";
    const SEARCH_ALL_EMAILS_STR = "@";

    public function init()
    {
        $this->RCMAIL = rcmail::get_instance();
		
        $this->add_hook('message_ready', array($this, 'message_ready'));
        $this->add_hook('addressbook_export_init', array($this, 'addressbook_export_init'));

        /* Hooks to process encrypted emails on backend and deliver metadata to client */
        // Preview / Show
        $this->add_hook('message_objects', array($this, 'message_objects'));
        // Compose
        $this->add_hook('message_compose_body', array($this, 'message_compose_body'));

        // Listing folders
        $this->add_hook('messages_list', array($this, 'messages_list'));
        
        //message load
        $this->add_hook('message_load', array($this, 'message_load'));
        $this->add_hook('message_part_structure', array($this, 'message_part_structure'));

        // Generic output
        $this->add_hook('render_page', array($this, 'render_page'));

        // Others

        $this->add_hook('identity_delete', array($this, 'identity_delete'));
        $this->add_hook('identity_update', array($this, 'identity_update'));
		
        if ($this->RCMAIL->task=='mail' && ($this->RCMAIL->action=='show' || !$this->RCMAIL->action)){
        	$this->RCMAIL->html_editor();
        }
        $this->include_script('js/ec_client_cfg.js');
        $this->include_script('js/ec_utils.js');
        $this->include_script('js/ec_storage.js');
        $this->include_script('js/ec_client.js');
        $this->include_script('js/ec_settings.js');
        $this->include_script('js/ec_compose.js');
        $this->include_script('js/ec_ui.js');
        $this->include_script('js/ec_list_mailbox.js');

        /* Load PKD Front-end files */
        $this->include_script('js/pkd_client/bower_components/openpgp/dist/openpgp.js');
        $this->include_script('js/pkd_client/bower_components/fetch/fetch.js');
        $this->include_script('js/pkd_client/pkd_client_conf.js');
        $this->include_script('js/pkd_client/pkd_client.js');

        /* UI Changes */
        $this->include_script('js/select2.js');
        $this->include_stylesheet('css/select2.css');
        $this->include_stylesheet('css/ec_css.css');
        $this->add_texts('localization/', true);

    }

    public function message_ready($msg)
    {
        if (!$this->enableMimeFormat) {
            return;
        }

        $contentType = '';
        $inp_enc = rcube_utils::get_input_value('_ec_enc', rcube_utils::INPUT_GPC);
        $inp_is_html = rcube_utils::get_input_value('_is_html', rcube_utils::INPUT_GPC);
        $inp_ishtml = rcube_utils::get_input_value('_ec_ishtml', rcube_utils::INPUT_GPC);
        $inp_boundary = rcube_utils::get_input_value('_ec_boundary', rcube_utils::INPUT_GPC);
        $_ec_encoding = rcube_utils::get_input_value('_ec_encoding', rcube_utils::INPUT_GPC);
        $ec_type = rcube_utils::get_input_value('_ec_type', rcube_utils::INPUT_GPC);
        $MSG_MIME = $msg['message'];
        
        $reply_uid=rcube_utils::get_input_value('_ec_reply_uid', rcube_utils::INPUT_GPC);
        $forward_uid=rcube_utils::get_input_value('_ec_forward_uid', rcube_utils::INPUT_GPC);
        $mbox=rcube_utils::get_input_value('_ec_mbox', rcube_utils::INPUT_GPC);
        
        if ($reply_uid) {
        	$this->RCMAIL->storage->set_flag($reply_uid, 'ANSWERED', $mbox);
        }
        if ($forward_uid) {
        	$this->RCMAIL->storage->set_flag($forward_uid, 'FORWARDED', $mbox);
        }

        if (!$inp_enc) {
        	if ($inp_boundary){
        		$contentType = 'mix';
        		if ($ec_type=='alt')$contentType='alt';
        		$transfer_encoding = '8bit';
        		$charset = "UTF-8";
        		$txt = rcube_utils::get_input_value('_message', rcube_utils::INPUT_GPC, true, $charset);
        		$MSG_MIME->setParam('boundary', $inp_boundary);
        		$MSG_MIME->setParam('head_charset', $charset);
        		$MSG_MIME->setParam('html_charset', $charset);
        		$MSG_MIME->setParam('text_charset', $charset);
        		$MSG_MIME->setParam('text_encoding', $transfer_encoding);
        		$MSG_MIME->setParam('html_encoding', $transfer_encoding);
        		$MSG_MIME->setParam('head_encoding', $transfer_encoding);
        		if ($contentType=='mix')
        			$MSG_MIME->setContentType('multipart/mixed', array());
        		else if ($contentType=='alt')
        			$MSG_MIME->setContentType('multipart/alternative', array());
        		$MSG_MIME->setTXTBody($txt);
        	}
        } else {
            $ec_pgp = new EC_PGP_MIME();
            $ec_pgp->packMIME($MSG_MIME);
            //$txt=$MSG_MIME->getTXTBody();
            $transfer_encoding = '8bit';
            $charset = "UTF-8";
            $txt = rcube_utils::get_input_value('_message', rcube_utils::INPUT_GPC, true, $charset);
            $ec_pgp->setContent($txt);
            $encName = 'encrypted.asc';
            $b1 = $ec_pgp->genBoundary();

            if ($inp_ishtml) $contentType = 'pgp';
            else $contentType = 'txt';
            if ($inp_boundary) {
                $b1 = $inp_boundary;
                if ($contentType == 'txt' || $contentType == 'html') {
                    $contentType = 'mix';
                }
            }

            if ($contentType) {
                $MSG_MIME->setParam('boundary', $b1);
                $MSG_MIME->setParam('head_charset', $charset);
                $MSG_MIME->setParam('html_charset', $charset);
                $MSG_MIME->setParam('text_charset', $charset);
                $MSG_MIME->setParam('text_encoding', $transfer_encoding);
                $MSG_MIME->setParam('html_encoding', $transfer_encoding);
                $MSG_MIME->setParam('head_encoding', $transfer_encoding);
            }
            $preamble='';
            $txt = '';

            switch ($contentType) {
                case '64':
                case 'base64':

                    break;
                case 'pgp':
                    $MSG_MIME->setContentType('multipart/encrypted', array('protocol' => 'application/pgp-encrypted'));
                    $txt .= $preamble.$ec_pgp->openBoundary($b1) . $ec_pgp->getNL();
                    $txt .= $ec_pgp->genContentType('app-pgp') . $ec_pgp->getNL() .
                        $ec_pgp->genContentDescription('pgp-v') . $ec_pgp->getNL() . $ec_pgp->getNL() . $ec_pgp->getVersion('1') . $ec_pgp->getNL() . $ec_pgp->getNL() .
                        $ec_pgp->openBoundary($b1) . $ec_pgp->getNL();
                    $txt .= str_replace('%ENC_NAME%', $encName, $ec_pgp->genContentType('app-enc')) . $ec_pgp->getNL() .
                        $ec_pgp->genContentDescription('php') . $ec_pgp->getNL() .
                        $ec_pgp->genContentDisposition($encName) . $ec_pgp->getNL() . $ec_pgp->getNL() .
                        $ec_pgp->getContent();
                    $txt .= $ec_pgp->getNL() . $ec_pgp->closeBoundary($b1) . $ec_pgp->getNL();
                    break;
                case 'mix':
                    $MSG_MIME->setContentType('multipart/mixed', array());
                    $txt .= $ec_pgp->getContent();
                    break;
                case 'txt':
                    $MSG_MIME->setContentType('text/plain', array('charset' => "UTF-8"));
                    $txt .= $ec_pgp->getContent();
                    break;
                case 'html':
                    $MSG_MIME->setContentType('text/html', array('charset' => "UTF-8"));
                    $txt .= $ec_pgp->getContentWrapper();
                    break;
                default:

                    break;
            }

            $MSG_MIME->setTXTBody($txt);
        }
    }

    public function identity_delete()
    {
        return array('abort' => '1', 'result' => false);
    }

    public function identity_update($input)
    {
        unset($input['record']['email']);
        return $input;
    }

    /*
        * For Compose action:
        * Set rcmail.env variables for ec_client.js:
        *  is_encrypted = true / false
        *  recipients = array("to" : "" , "cc" : "" , "reply_to" : "")
        *  source = [view source]
        */
    public function message_compose_body($args)
    {
        // global $message attribute set in compose.inc
        global $MESSAGE;
        global $COMPOSE;

        if (isset($COMPOSE['param']['ec_cache'])) {
            $ec_cache=$COMPOSE['param']['ec_cache'];
        } else {
            $ec_cache = false;
        }

        $metadata = $this->get_message_metadata($MESSAGE,$ec_cache==2);
        $recipients = array();

        // Default values
        $mode = "new";
        $recipients["to"] = "";
        $recipients["cc"] = "";
        $recipients["bcc"] = "";

        // Update recipient lists according to reply action
        if ($args["mode"] == "reply") {
            $mode = "reply";

            // Set the "To" field
            if (isset($metadata["recipients"]["reply_to"])) {
                $recipients["to"] = $metadata["recipients"]["reply_to"];
            } else {
                $recipients["to"] = $metadata["recipients"]["from"];
            }

            // In case of reply to all: CC' = CC + To
            if (isset($MESSAGE->reply_all) and $MESSAGE->reply_all == "all") {
                // Reply all mode
                $mode = "reply_all";

                $recipients["cc"] = $metadata["recipients"]["to"] . ", " . $metadata["recipients"]["cc"];
            }
        } else if ($args["mode"] == "forward") {
            // Forward mode - lists should be empty
            $mode = "forward";

        } else if ($args["mode"] == "draft") {
            $recipients["to"] = $metadata["recipients"]["to"];
            $recipients["cc"] = $metadata["recipients"]["cc"];
            $recipients["bcc"] = $metadata["recipients"]["bcc"];

        } else if ($args["mode"] == null) {
            // New email
            $recipients["to"] = $metadata["recipients"]["to"];
        }
        
        $addressbook=array();
        $records=$this->get_addressbook_contacts(ec_plugin::SEARCH_ALL_EMAILS_STR,ec_plugin::RECENT_ADDRESS_ID);
        if (count($records)>0)$addressbook=$records;

        // Update rcmail.env
        $this->set_env_variable("is_encrypted", $metadata["is_encrypted"]);
        $this->set_env_variable("recipients", $recipients);
        $this->set_env_variable("source", $metadata["source"]);
        $this->set_env_variable('compose_mode', $mode);
        $this->set_env_variable('addressbook', $addressbook);

        return $args;
    }
	
    public function extract_email($str){
    	$xpl=explode('<',$str);
    	$e='';
    	$n='';
    	if (count($xpl)>1){
    		$n=$xpl[0];
    		$e=$xpl[1];
    		$xpl2=explode('>',$e);
    		if (count($xpl2)>1){
    			$e=$xpl2[0];
    		}
    	} else {
    		$e=$str;
    		$n=$str;
    	}
    	$ex=explode(' ',$n);
    	$namespl=array();
    	foreach($ex as $k=>$v){
    		if ($v)array_push($namespl,$v);
    	}
    	$res=array('name'=>$n, 'email'=>$e, 'namespl'=>$namespl);
    	return $res;
    }
    
    public function get_addressbook_contacts($search, $sourceinp=null, $size=null, $offset=null, $strict=false)
    {
    	global $RCMAIL, $OUTPUT, $SEARCH_MODS_DEFAULT, $PAGE_SIZE;
    	$PAGE_SIZE_NEW=200;
    	$PAGE_OFFSET=0;
    	if ($size)$PAGE_SIZE_NEW=$size;
    	if ($offset)$PAGE_OFFSET=$offset;
    	$fields=array('name','firstname','surname','email');
    	$osearch=$search;
    	if ($strict)$search=ec_plugin::SEARCH_ALL_EMAILS_STR;
    	$extracted=$this->extract_email($osearch);
    	
    	$sources    = $RCMAIL->get_address_sources();
    	$search_set = array();
    	$records    = array();
    	$sort_col   = $RCMAIL->config->get('addressbook_sort_col', 'name');
    	$afields = $RCMAIL->config->get('contactlist_fields');
    	
    	foreach ($sources as $s) {
    		if ($sourceinp && $s['id']!=$sourceinp)continue;
    		$source = $RCMAIL->get_address_book($s['id']);
    	
    		// check if search fields are supported....
    		if (is_array($fields)) {
    			$cols = $source->coltypes[0] ? array_flip($source->coltypes) : $source->coltypes;
    			$supported = 0;
    	
    			foreach ($fields as $f) {
    				if (array_key_exists($f, $cols)) {
    					$supported ++;
    				}
    			}
    	
    			// in advanced search we require all fields (AND operator)
    			// in quick search we require at least one field (OR operator)
    			if (($adv && $supported < count($fields)) || (!$adv && !$supported)) {
    				continue;
    			}
    		}
    		
    		// reset page
    		$source->set_page(1);
    		$source->set_pagesize(9999);
    	
    		// get contacts count
    		$result = $source->search($fields, $search, $mode, false);
    	
    		if (!$result->count) {
    			continue;
    		}
    	
    		// get records
    		$result = $source->list_records($afields);
    	
    		while ($row = $result->next()) {
    			$row['sourceid'] = $s['id'];
    			$key = rcube_addressbook::compose_contact_key($row, $sort_col);
    			$swords=array();
    			if (!empty($row['name']))array_push($swords, strtolower($row['name']));
    			if (!empty($row['surname']))array_push($swords, strtolower($row['surname']));
    			if (!empty($row['firstname']))array_push($swords, strtolower($row['firstname']));
    			foreach($row['email'] as $k=>$v){
    				if ($v)array_push($swords, strtolower($v));
    			}
    			$swordsstr=implode(' ',$swords);
    			if ($strict && $swords){
    				$w=explode(' ',$swordsstr);
    				$row['swords']=$swordsstr;
    				$score=0;
    				foreach($w as $k=>$v){
    					if ($v){
    						$ve=filter_var($v, FILTER_VALIDATE_EMAIL);
    						
    						if (!$ve && stristr($v, $extracted['name'])==$v){
    							$records[$key] = $row;
    							break;
    						} else if ($ve && stristr($v, $extracted['email'])==$v){
    							$records[$key] = $row;
    							break;
    						} else {
    							foreach($extracted['namespl'] as $kk=>$vv){
    								if (!$ve && stristr($v, $vv)==$v){
    									$score++;
    									break;
    								}
    							}
    							if ($score>0 && $score==count($extracted['namespl'])){
    								$records[$key] = $row;
    								break;
    							}
    						}
    					}
    				}
    			} else {
    				$records[$key] = $row;
    			}
    		}
    	
    		unset($result);
    		$search_set[$s['id']] = $source->get_search_set();
    	}
    	
    	// sort the records
    	ksort($records, SORT_LOCALE_STRING);
    	usort($records, function($a,$b){
    		if ($a['sourceid']==$b['sourceid'])return 0;
    		if ($a['sourceid']==ec_plugin::RECENT_ADDRESS_ID)return -1;
    		else return 1;
    	});
    	$recentAddresses=array();
    	$newrecords=array();
    	foreach($records as $k=>$v){
    		$add=true;
    		foreach($v['email'] as $kk=>$vv){
    			if (in_array(strtolower($vv), $recentAddresses)){
    				$add=false;
    				break;
    			}
    			if($v['sourceid']==ec_plugin::RECENT_ADDRESS_ID){
    				array_push($recentAddresses, strtolower($vv));
    			}
    		}
    		if ($add)array_push($newrecords, $v);
    	}
    	$records=$newrecords;
    	
    	// create resultset object
    	$count  = count($records);
    	$result = new rcube_result_set($count);
    	
    	$records = array_slice($records, $PAGE_OFFSET, $PAGE_SIZE_NEW);
    	
    	$result->records = array_values($records);
    	//die(json_encode($result->records));
    	return $result->records;
    }
    
    /*
     * For Preview / Show actions:
     * Set rcmail.env variables for ec_client.js:
     *  is_encrypted = true / false
     *  recipients = array("to" : "" , "cc" : "" , "reply_to" : "")
     *  source = [view source]
     */
    public function message_objects($args)
    {

        // Full message structure
        $message = $args['message'];
        $ec_cache = rcube_utils::get_input_value('_ec_cache', rcube_utils::INPUT_GPC, true);
        $metadata = $this->get_message_metadata($message, $ec_cache==2);

        if ($metadata["is_encrypted"] && !array_key_exists("EIDX", $message->headers->flags)) {
            // Detected un flagged encrypted email. Set flag.

            $storage = $this->RCMAIL->get_storage();
            $storage->set_flag($message->uid, 'EIDX', $message->folder); // Marked as encrypted
        }

        // Update rcmail.env
        $this->set_env_variable("is_encrypted", $metadata["is_encrypted"]);
        $this->set_env_variable("recipients", $metadata["recipients"]);
        $this->set_env_variable("source", $metadata["source"]);
        $this->set_env_variable("size", $metadata["size"]);

        
        if ($ec_cache==1 && !empty($metadata['source'])){
        	die($metadata['source']);
        }

        return $args;
    }

    private function set_env_variable($var, $val)
    {
        $this->RCMAIL->output->set_env("ec_" . $var, $val);
    }

    private function get_decoded_address_list($addresses,$count=null) {
        $out = [];
        if (isset($addresses)) {
            $a = rcube_mime::decode_address_list($addresses,$count);
            if (is_array($a)) {
                foreach ($a as $val) {
                    $val = $val["string"] != "" ? $val["string"] : $val["email"];
                    $out[] = $val;
                }
            }
        }

        if (sizeof($out) > 0)
            return implode(" , ", $out);
        else
            return "";
    }

    private function get_message_metadata($message, $nosource=false)
    {

        global $COMPOSE;

        // variables to set for ec_client.js
        $is_encrypted = false;
        $recipients = array();
        $source = "";

        if (isset($message)) {

            // Set recipients of original email
            $recipients['from'] = $this->get_decoded_address_list($message->headers->from,1);
            $recipients['to'] = $this->get_decoded_address_list($message->headers->to);
            $recipients['cc'] = $this->get_decoded_address_list($message->headers->cc);
            $recipients['bcc'] = $this->get_decoded_address_list($message->headers->bcc);
            if (isset($message->headers->replyto) and $message->headers->replyto != "") {
                $recipients['reply_to'] = $this->get_decoded_address_list($message->headers->replyto);
            }

            //---- Check if Email is encrypted ----
            if (is_array($message->headers->flags) && array_key_exists("EIDX", $message->headers->flags)) {
                $is_encrypted = true;
            } else {
                $is_encrypted = $this->isEncrypted($message, true);
            }

            if ($this->deliverSource || $is_encrypted || isset($COMPOSE)) {
                // Email is encrypted. Send complete source to frontend.
              if (!$nosource || isset($COMPOSE))  $source = $this->RCMAIL->storage->get_raw_body($message->uid);
            }
        }

        if (isset($COMPOSE)) {
            if (is_array($COMPOSE['param']) && isset($COMPOSE['param']['to']))
                $recipients['to'] .= $COMPOSE['param']['to'];
        }

        //---- Set email size ----
        $size = $message->headers->size;

        return (array(
            "is_encrypted" => $is_encrypted,
            "recipients" => $recipients,
            "source" => base64_encode($source),
            "size" => $size
        ));
    }



    private function isEncrypted($mail, $force=false) {
        # Check for standard PGP/MIME
        if($mail->headers->ctype == ec_plugin::PGP_MIME_CTYPE || $mail->ctype == ec_plugin::PGP_MIME_CTYPE) {
            return true;
        } else if ($mail->headers->ctype == ec_plugin::MULTIPART_MIME &&
            (isset($mail->headers) && !isset($mail->headers->structure))) {
            $mail = $this->RCMAIL->storage->get_message($mail->uid);
        }

        // Scan headers for PGP/MIME
        if (is_array($mail->structure->parts)) {
            foreach ($mail->structure->parts as $part) {
                if ($part->mimetype == ec_plugin::PGP_MIME_CTYPE_PGP) {
                    // PGP/MIME type detected
                    return true;
                }
            }
        }

        if (is_array($mail->headers->structure->parts)) {
            foreach ($mail->headers->structure->parts as $part) {
                if ($part->mimetype == ec_plugin::PGP_MIME_CTYPE_PGP) {
                    // PGP/MIME type detected
                    return true;
                }
            }
        }

        // Scan email body for INLINE PGP parts
        if ($force) {
            if (is_array($mail->mime_parts)) {
                foreach ($mail->mime_parts as $part) {
                    if ($part->mimetype == 'text/plain' || $part->mimetype == 'text/html' || $part->mimetype == 'text/enriched') {
                        $mail->get_part_body($part->mime_id);
                        if ((($a = strpos($part->body, ec_plugin::INLINE_PGP_PREFIX)) !== false) &&
                            (($b = strpos($part->body, ec_plugin::INLINE_PGP_SUFFIX)) !== false) &&
                            $b > $a
                        ) {
                            // Inline PGP block detected
                            return true;
                        }
                    } else if ($part->mimetype == ec_plugin::PGP_MIME_CTYPE || $part->mimetype == ec_plugin::PGP_MIME_CTYPE_PGP){
                    	return true;
                    }
                }
            }

            if (is_array($mail->parts)) {
                foreach ($mail->parts as $part) {
                    if (is_string($part->body)) {
                        if ((($a = strpos($part->body, ec_plugin::INLINE_PGP_PREFIX)) !== false) &&
                            (($b = strpos($part->body, ec_plugin::INLINE_PGP_SUFFIX)) !== false) &&
                            $b > $a
                        ) {
                            return true;
                        }
                    }
                }
            }
        }

        // Scan attachments
        if (is_array($mail->attachments)) {
            foreach ($mail->attachments as $attachment) {
            	if ($attachment->ctype_secondary=='octet-stream' && $attachment->filename=='encrypted.asc')return true;
            	if (strpos($attachment->ctype_secondary, "pgp") !== false || strpos($attachment->ctype_secondary, "asc") !== false)
                    return true;
            }
        }

        return false;
    }
	
    /**
     * https://webmail.stage.easycrypt.co/?_task=addressbook&_action=export&search_recipient=@&source_inp=collected&size=5&offset=2 
	 *	size - not required, int, 0-N
	 *	offset - not required, int, 0-N
	 *	source_inp - not required, string, 
	 *	search_recipient - required, string
	 *  strict - not required, int, 0 or 1
	 *  offset - not required, int, >0
     **/
    public function addressbook_export_init($args) {
    	$search_recipient = rcube_utils::get_input_value('search_recipient', rcube_utils::INPUT_GPC);
    	if ($search_recipient){
    		$search_recipient=base64_decode($search_recipient);
    		$size=rcube_utils::get_input_value('size', rcube_utils::INPUT_GPC);
    		$offset=rcube_utils::get_input_value('offset', rcube_utils::INPUT_GPC);
    		$source_inp=rcube_utils::get_input_value('source_inp', rcube_utils::INPUT_GPC);
    		$strict=rcube_utils::get_input_value('strict', rcube_utils::INPUT_GPC);
    		$page=rcube_utils::get_input_value('page', rcube_utils::INPUT_GPC);
    		if ($page && $size){
    			$offset=(int)$page * (int)$size;
    		}
    		if ($strict)$strict=true;
    		else $strict=false;
    		$ab=$this->get_addressbook_contacts($search_recipient, $source_inp, $size, $offset, $strict);
    		header('Content-type: application/json');
    		die(json_encode($ab));
    	} else {
    		header('Content-type: application/json'); 
    		die(json_encode(array()));
    	}
    }
    
    public function message_load($args){
    	$rcubemsg=$args['object'];
    }
    
    public function message_part_structure($args){
    	$rcubemsg=$args['object'];
    	$struct=$args['structure'];
    }
    
    /**
     * Hook on messages_list.
     * Used to add indication to client if an email is encrypted
     *
     * @param $args
     * @return mixed
     */
    public function messages_list($args)  {
        $storage = $this->RCMAIL->get_storage();

        // Loop over all emails in message list
        if (is_array($args["messages"])) {
            foreach ($args["messages"] as $mail) {

                $is_encrypted = false;
                $full_mail = null; // clear any previously fetched full email body

                // Add size flag
                $mail->flags['size'] = $mail->size;

                // Skip emails that were already processed. If they are encrypted, EIDX is already set.
                if (is_array($mail->flags) && !array_key_exists("EIDX", $mail->flags)) {
                    // First time processing email

                    if ($this->isEncrypted($mail)) {
                        // PGP/MIME according to primary CTYPE
                        $is_encrypted = true;
                    }
                }

                // Update IMAP flags
                // $storage->set_flag($mail->uid, 'EID', $mail->folder); // Marked for being processed
                if ($is_encrypted) {
                    $storage->set_flag($mail->uid, 'EIDX', $mail->folder); // Marked as encrypted
                    // Inject flag to email in current email list
                    $mail->flags['EIDX'] = true;
                }
            }
        }
        return $args;
    }

    /**
     * Add to client list of all account's email addresses.
     * @param $args
     */
    public function render_page($args) {
        $identities = $this->RCMAIL->user->list_identities(null, true);
        $identities_out = array();

        foreach ($identities as $id) {
            $identities_out[] = array("email" => $id["email"], "ident" => $id["ident"]);
        }

        $this->set_env_variable("identities", $identities_out);

        return $args;
    }
}