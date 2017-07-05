<?php

/**
 * EasyCrypt.co RoundCube Adaptation Plugin
 * Copyright 2017, EasyCrypt.co
 * See README for details.
 *
 * @version 0.2.12
 */

$labels = array();
$labels['save_drafts_warning_title'] = 'Save to drafts';
$labels['save_drafts_warning'] = 'Warning! Email will be saved unencrypted on the server';
$labels['save_drafts_button'] = 'Save draft';


$messages = array();
$messages['send_mail_max_size'] = 'Cannot send email. Email exceeds maximum allowed size of $max_size (current size: $cur_size)';
$messages['input_recipients'] = 'Please specify at least one recipient';

// Encryption status message
$messages['enc_status_selective_enc'] = "This message will be encrypted for part of the recipients";
$messages['enc_status_no_enc'] = "This message will not be encrypted";
$messages['enc_status_all_enc'] = "This message will be encrypted";

$messages['setm_account'] = "Account";
$messages['setm_help'] = "Help";
$messages['setm_logout'] = "Log out";
$messages['setm_settings'] = "Settings";
$messages['helpm_faq'] = "FAQ";
$messages['helpm_faq2'] = "Beta FAQ";

$messages['pass_popup_ok'] = "OK";
$messages['pass_popup_cancel'] = "Cancel";
$messages['pass_popup_enter'] = "Enter passphrase";
$messages['pass_popup_logout'] = "Logout";
$messages['pass_popup_msg'] = "Please enter your password to unlock the secret key of your account";
$messages['pass_popup_error'] = "Invalid passphrase; Please try again.";
$messages['pass_popup_check'] = "PLEASE WAIT, UNLOCKING MAILBOX...";
$messages['pass_headline']="Secure webmail";
$messages['pass_placeholder']="EasyCrypt Password";

$messages['comopt_encrypt'] = "Encrypt";

$messages['input_invalid_email'] = "Not valid email: ";
$messages['alert_fail_decrypt_att'] = "Failed to decrypt attachment";
$messages['att_html_show'] = "Show";
$messages['att_html_download'] = "Download";

$messages['msg_loading'] = "Loading";
$messages['msg_encrypt'] = "Encrypting";
$messages['msg_encrypt_draft'] = "Encrypting Draft";
$messages['msg_decrypt'] = "Decrypting";
$messages['msg_send'] = "Sending message";
$messages['msg_decrypted'] = "Message decrypted";
$messages['msg_invalidmove'] = "Message(s) cannot be moved to #F";
$messages['msg_invalidcopy'] = "Message(s) cannot be copied to #F";
$messages['msg_searching']="Searching...";
$messages['compose_select_default_msg']="Enter an email address";

$messages['upload_att_msg'] = 'Maximum allowed file size is $max_size';
$messages['upload_att_attach'] = "Attach";

$messages['nosent_title'] = "Discard message?";
$messages['nosent_discard'] = "Discard";
$messages['nosent_no'] = "No";
$messages['nosent_cancel'] = "Cancel";
$messages['nosent_save'] = "Save";

$messages['ajax_sent']="Message sent successfully.";
$messages['ajax_nosent']="Message was not sent.";
$messages['invalid_emails_msg']="The message will not be encrypted for some of the recipients";
$messages['invalid_mode2']="It's OK";
$messages['invalid_invite']="Invite";
$messages['invalid_title_mode2']="The message will be sent unencrypted to <list>";
$messages['invalid_emails_title']="Warning";
$messages['invalid_emails_ok']="It's OK";
$messages['invalid_emails_cancel']="Cancel";
$messages['ajax_draft']="Message saved to Drafts.";

$messages['queue_sent']="Mail Sent";
$messages['queue_add']="Mail added to Outbox";
$messages['queue_sending']="Sending email queue";
$messages['outbox_title']="Outbox";
$messages['outbox_msg']="Emails in queue";
$messages['outbox_settings']="Queue Settings";
$messages['queue_status1']="Good Service";
$messages['queue_status2']="Service not running";
$messages['queue_status3']="Bad Service";
$messages['queue_status4']="Service online";

$messages['No_messages_found_in_this_mailbox_']="No messages found in this mailbox";

$messages['moremenu_sendagain']="Send again...";
$messages['close']="Close";
$messages['abort']="Abort";
$messages['searchfolder']="Search folder";
$messages['searchradio2']="This folder and its subfolders";

$messages['invite']="Invite";
$messages['invite_contacts']="Invite contacts";
$messages['invite_send']="Send";
$messages['invite_cancel']="Cancel";
$messages['invite_ok']="OK";
$messages['invite_count_notify']="You have <number> invitations left";
$messages['invite_sent_notify']="<Number> Invitation(s) sent";
$messages['invite_esent']="Invitation to <emailadr> has been sent";
$messages['invite_warning']="You have only <number> invitations left. Delete some addresses and try again";
$messages['invite_invalidemails']="Some emails are invalid.";
$messages['invite_popup_title']="Type email addresses of people to be invited, separated by commas or newlines";
$messages['invite_title']="Invite your friends to EasyCrypt";
$messages['invite_subnotify']="*Some invitees are already subscribed, or invites failed to be sent";
$messages['invite_restype1']="already an EasyCrypt user";
$messages['invite_restype2']="invitation not sent";
$messages['invite_restype3']="email service is not supported";
$messages['invite_directsend']="Sending invites...";
$messages['invite_directsend2']="Sending invite...";

$messages['loggingout']="Please wait, Logging out...";

$messages['decrypt_error']="Message cannot be decrypted";

$messages['feedback_title']="Help us to improve EasyCrypt";
$messages['feedback_subtitle']="We would be grateful for your feedback! Every message will be reviewed by our product team.";
$messages['feedback_submit']="Submit";
$messages['feedback_close']="Cancel";
$messages['feedback_summary']="Summary";
$messages['feedback_desc']="Description";
$messages['feedback_about']="Topic";
$messages['feedback_option1']="Usability";
$messages['feedback_option2']="Security";
$messages['feedback_option3']="Feature request";
$messages['feedback_option4']="Other";
$messages['feedback_input_summary']="Please, input your summary request";
$messages['feedback_input_description']="Please, describe the case";
$messages['feedback_isending']="Sending your feedback";
$messages['feedback_btn']="Feedback";
$messages['feedback_emailtitle']="Webmail Feedback";

$messages['tooltip_invitebtn']="Invite friends to EasyCrypt";
$messages['tooltip_encbtn']="Encrypted end-to-end";
$messages['tooltip_markbtn']="Mark read/unread";
$messages['tooltip_invitebtn2']="Invite to EasyCrypt";

$messages['addpkey']="Attach public key (Optional)";
$messages['green_line_msg']="Encrypted message";

$messages['ccompose_htitle']="New Message";
$messages['ccompose_htitler']="Reply Message";
$messages['ccompose_htitled']="Draft Message";
$messages['ccompose_htitlef']="Forward Message";
$messages['ccompose_from']="From";
$messages['ccompose_to']="To";
$messages['ccompose_cc']="Cc";
$messages['ccompose_bcc']="Bcc";
$messages['ccompose_subject']="Subject";
$messages['ccompose_sendbtn']="Send";
$messages['ccompose_savebtn']="Save";
$messages['ccompose_attachbtn']="Attach";
$messages['ccompose_recipients']="Recipients";
$messages['ccompose_trashbtn']="Discard Draft";
$messages['ccompose_closebtn']="Save & Close";
$messages['ccompose_loading']="Loading...";

$messages['msgtoolbar_back']="Back";

$messages['recbox_nenc_tt']="The message to <email> will not be encrypted";
$messages['recbox_enc_tt']="The message to <email> will be encrypted";
$messages['recbox_eenc_tt']="The message to <email> (external PGP user) will be encrypted";

//rcmail.get_label('ec_plugin.xx')

?>