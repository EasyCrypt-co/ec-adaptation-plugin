/*********************************************************/
/*        Override list_mailbox of app.js                */
/*********************************************************/

// list messages of a specific mailbox
delete rcmail.list_mailbox;
rcube_webmail.prototype.list_mailbox = function (mbox, page, sort, url, update_only) {
    var win, target = window;

    if (typeof url != 'object')
        url = {};

    if (!mbox)
        mbox = this.env.mailbox ? this.env.mailbox : 'INBOX';

    // add sort to url if set
    if (sort)
        url._sort = sort;

    // folder change, reset page, search scope, etc.
    if (this.env.mailbox != mbox) {
        page = 1;
        this.env.current_page = page;
        this.env.search_scope = 'base';
        this.select_all_mode = false;
        this.reset_search_filter();
    } else {
        update_only=1;
        url._clear=1;
        // also send search request to get the right messages
        if (this.env.search_request)
            url._search = this.env.search_request;
    }

    if (!update_only) {
        // unselect selected messages and clear the list and message data
        this.clear_message_list();

        if (mbox != this.env.mailbox || (mbox == this.env.mailbox && !page && !sort))
            url._refresh = 1;

        this.select_folder(mbox, '', true);
        this.unmark_folder(mbox, 'recent', '', true);
        this.env.mailbox = mbox;
    }

    // load message list remotely
    if (this.gui_objects.messagelist) {
        this.list_mailbox_remote(mbox, page, url);
        return;
    }

    if (win = this.get_frame_window(this.env.contentframe)) {
        target = win;
        url._framed = 1;
    }

    if (this.env.uid)
        url._uid = this.env.uid;

    // load message list to target frame/window
    if (mbox) {
        this.set_busy(true, 'loading');
        url._mbox = mbox;
        if (page)
            url._page = page;
        this.location_href(url, target);
    }
};