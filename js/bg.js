

	var params = {};
	if( (account = localStorage.getItem('temporary-mail-account')) ){params = JSON.parse(account);}
	var _tenminutemail = new _tenminutemail(params);
	_tenminutemail.addEventListener('new-mail',function(message){
		chrome.browserAction.setBadgeText({'text':_tenminutemail._mail_count + ''});
		chrome.notifications.create('',{
			type: 'basic',
			iconUrl: 'images/logo.128.png',
			title: message.subject,
			message: 'From: ' + message.fromList.join(', ')
		});
	});
	_tenminutemail.addEventListener('keepalive',function(){
console.log('keepalive');
		if( (account = localStorage.getItem('temporary-mail-account')) ){
			/* Update the 'lastSeen' timestamp of the current account */
			params = JSON.parse(account);
			params.time = Date.now();
			localStorage.setItem('temporary-mail-account',JSON.stringify(params));
		}
	});

	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if( message.command ){switch( message.command ){
			case 'mail.exists':
				var time = Date.now();
				var account = localStorage.getItem('temporary-mail-account');
				if( account ){
					/* Si hacía tiempo que no tenía contacto con la cuenta
					 * posiblemente haya caducado ya */
					account = JSON.parse(account);
					if( !('time' in account) || ( (time - account.time) / 1000 ) > 800 ){account = false;}
				}
				sendResponse(account);
				break;
			case 'mail.create':
				_tenminutemail.create().then(function(account){
					account.time = Date.now();
					localStorage.setItem('temporary-mail-account',JSON.stringify(account));
					_message.send(function(){sendResponse(account);}).then(function(){},function(e){console.log(e);});
				}.bind(this),function(data){
					_message.send(function(){sendResponse(data);}).then(function(){},function(e){console.log(e);});
				});
				break;
			case 'mail.destroy':
				localStorage.removeItem('temporary-mail-account');
				_tenminutemail.destroy().then(function(){
					chrome.browserAction.setBadgeText({'text':''});
					sendResponse({});					
				},function(){
					//FIXME: pasar error
					sendResponse({});
				});
				break;
			case 'mail.inbox':
				_message.send(function(){sendResponse(_tenminutemail._messages.reverse());}).then(function(){},function(e){console.log(e);});
				break;
		}}
		return true;
	});
