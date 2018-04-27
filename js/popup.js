function hasReadMail(id) {
    return localStorage.getItem(`id-${id}`);
}
function setMailRead(id, read) {
    localStorage.setItem(`id-${id}`, read);
}
function _popup() {
    this.load();
};

_popup.prototype.load = function () {
    /* INI-Close buttons */
    var nodeList = Array.prototype.slice.call(document.querySelectorAll('.btn-close'));
    if (nodeList.length) {
        nodeList.forEach(function (v, k) {
            v.addEventListener('click', function (e) {
                this.close();
            }.bind(this));
        }.bind(this));
    }
    /* END-Close buttons */
    this.elem_main = document.querySelector('body > main');
    this.elem_mail_inbox_logo_empty = document.querySelector('.mail-inbox .logo.empty');
    this.elem_mail_inbox_messages = document.querySelector('.mail-inbox-messages');
    this.nav_back = document.querySelector('.nav.back');
    this.btn_create = document.querySelector('.btn.create');
    this.btn_destroy = document.querySelector('.btn.destroy');
    this.btn_copy = document.querySelector('.btn.copy');
    /* Check if there is a current account */
    this.exists().then(function () {
        /* If exists, check inbox */
        this.inbox();
    }.bind(this), function () {});
    this.nav_back.addEventListener('click', function () {
        this.inbox();
    }.bind(this));
    this.btn_create.addEventListener('click', function () {
        /* If the button is loading, then we cant do this twice */
        if (this.btn_create.classList.contains('loading')) {
            return false;
        }
        this.create();
    }.bind(this));
    this.btn_destroy.addEventListener('click', function () {
        /* If the button is loading, then we cant do this twice */
        if (this.btn_destroy.classList.contains('loading')) {
            return false;
        }
        this.destroy();
    }.bind(this));
    this.btn_copy.addEventListener('click', function () {
        var address = document.querySelector('.mail-inbox-address').innerHTML;
        var copyDiv = document.createElement('div');
        copyDiv.contentEditable = true;
        document.body.appendChild(copyDiv);
        copyDiv.innerHTML = address;
        copyDiv.unselectable = 'off';
        copyDiv.focus();
        document.execCommand('SelectAll');
        document.execCommand('Copy', false, null);
        document.body.removeChild(copyDiv);
    }.bind(this));
};
_popup.prototype.close = function () {
    window.close();
};
_popup.prototype.exists = function () {
    return new Promise(function (resolve, reject) {
        var message = {
            'command': 'mail.exists'
        };
        chrome.runtime.sendMessage(message, function (resp) {
            if (!resp) {
                reject({
                    'error': 'NOT_EXISTS'
                });
                return false;
            }
            this.tmp = document.querySelector('.mail-inbox-address');
            this.tmp.textContent = resp.address;
            //FIXME: tenemos que cambiar a vista
            resolve(resp);
        }.bind(this));
    }.bind(this));
};
_popup.prototype.create = function () {
    return new Promise(function (resolve, reject) {
        this.btn_create.innerHTML = 'Working ...';
        this.btn_create.classList.add('loading');
        var message = {
            'command': 'mail.create'
        };
        chrome.runtime.sendMessage(message, function (resp) {
            if (resp.error) {
                console.log(resp);
                reject(resp);
                return;
            }
            this.exists().then(function (resp) {
                resolve(resp);
                /* If exists, check inbox */
                this.inbox();
                //FIXME: devolver botón a su estado normal
            }.bind(this), reject);
        }.bind(this));
    }.bind(this));
};
_popup.prototype.destroy = function () {
    return new Promise(function (resolve, reject) {
        this.btn_destroy.innerHTML = 'Working ...';
        this.btn_destroy.classList.add('loading');
        var message = {
            'command': 'mail.destroy'
        };
        chrome.runtime.sendMessage(message, function (resp) {
            resolve(resp);
            this.welcome();
            this.btn_destroy.innerHTML = '<i class="fa fa-trash" aria-hidden="true"></i> Destroy';
            this.btn_destroy.classList.remove('loading');
        }.bind(this));
    }.bind(this));
};
_popup.prototype.welcome = function () {
    this.elem_main.setAttribute('class', '');
    this.elem_main.classList.add('get-mail');
};
_popup.prototype.inbox = function () {
    this.elem_main.setAttribute('class', '');
    this.elem_main.classList.add('mail-inbox');

    function getDateTimeFromTimestamp(unixTimeStamp) {
        var date = new Date(unixTimeStamp);
        return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
    }

    function getDateToday() {
        var date = new Date();
        return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
    }
    var message = {
        'command': 'mail.inbox'
    };
    chrome.runtime.sendMessage(message, function (resp) {
        this.elem_mail_inbox_logo_empty.style.display = 'block';
        if (resp.length) {
            this.elem_mail_inbox_messages.innerHTML = '';
            this.elem_mail_inbox_logo_empty.style.display = 'none';
        }
        resp.reverse().forEach(function (message) {
            //console.log(message);
            var node = document.createElement('LI');
            node.classList.add('mail-node');
            if (hasReadMail(message.id)) node.classList.add('read-mail');
            var wrapper = document.createElement('DIV');
            wrapper.classList.add('wrapper');
            node.appendChild(wrapper);
            var date = document.createElement('div');
            date.classList.add('date');
            var _date = getDateTimeFromTimestamp(message.sentDate);
            _date = _date.startsWith(getDateToday()) ? _date.substring(11) : _date.substring(0, 11);
            date.textContent = _date;
            wrapper.appendChild(date);
            var h3 = document.createElement('H3');
            h3.classList.add('sender');
            h3.textContent = message.fromList.join(', ');
            var h4 = document.createElement('H4');
            h4.classList.add('subject');
            h4.textContent = message.subject;

            wrapper.appendChild(h3);
            wrapper.appendChild(h4);

            var p = document.createElement('P');
            p.classList.add('body');
            p.textContent = message.bodyPreview;
            wrapper.appendChild(p);
            node.addEventListener('click', function () {
                this.view(message);
            }.bind(this));
            this.elem_mail_inbox_messages.appendChild(node);
        }.bind(this));
    }.bind(this));
};
_popup.prototype.view = function (message) {
    setMailRead(message.id, true);
    this.elem_main.setAttribute('class', '');
    this.elem_main.classList.add('mail-view');

    var elem_mail_view_subject = document.querySelector('.mail-view-subject');
    var elem_mail_view_sender = document.querySelector('.mail-view-sender');
    var elem_mail_view_body = document.querySelector('.mail-view-body');
    elem_mail_view_subject.textContent = message.subject;
    elem_mail_view_sender.textContent = 'From: ' + message.fromList.join(', ');
    elem_mail_view_body.innerHTML = message.bodyText;
    Array.from(elem_mail_view_body.getElementsByTagName('a')).forEach(e => e.target = '_blank');
};

let popup = new _popup();
