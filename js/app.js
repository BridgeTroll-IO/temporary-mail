
	function $ajax(url,params,callbacks){
		if( !callbacks ){callbacks = {};}
		var method = 'GET';
		var rnd = Math.floor(Math.random() * 10000);
		
		var postdata = false;
		if( params
		 && !params._data
		 && !('_cache' in params)
		 && !params._referer ){
			params = {'_data':params};
		}
		if( params._data ){
			method = 'POST';
			switch( true ){
				case ($is.object(params._data)):postdata = new FormData();for( var a in params._data ){postdata.append(a,params._data[a]);}break;
				case ($is.element(params._data) && params._data.tagName && params._data.tagName == 'FORM'):postdata = new postdata(params._data);break;
				default:postdata = params._data;
			}
		}

		if( !params._cache ){
			url += ( url.indexOf('?') > 0 ? '&' : '?' ) + 'rnd=' + rnd;
		}

		var xhr = new XMLHttpRequest();
		if( params._referer ){
			//console.log('referer' + params._referer);
			//xhr.setRequestHeader('referer',params._referer);
		}
		xhr.open(method,url,true);
		if( !params._binary ){
			xhr.onload = xhr.onerror = function(){
				if( callbacks.onEnd ){
					return callbacks.onEnd(xhr.responseText,xhr.getAllResponseHeaders());
				}
			}
		}else{
			xhr.responseType = 'arraybuffer';
			xhr.onload = xhr.onerror = function(oEvent){
				if( callbacks.onEnd ){
					return callbacks.onEnd(xhr.response,xhr.getAllResponseHeaders());
				}
			};
		}
		//if(!$is.formData(postdata)){xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');//}
		xhr.send(postdata);

		if(callbacks.onUpdate){var offset = 0;var timer = setInterval(function(){
			if(xhr.readyState == XMLHttpRequest.DONE){clearInterval(timer);}
			var text = xhr.responseText.substr(offset);
			if(!$is.empty(text)){var cmds = text.split("\n");$each(cmds,function(k,v){
				if($is.empty(v)){return false;}
				callbacks.onUpdate(v);
			});}
			offset = xhr.responseText.length;
		},1000);}
	}

	if( typeof $is == 'undefined' ){
		var $is = {
			set:      function(o,path){
				var stone;
				path = path || '';
				if( path.indexOf('[') !== -1 ){throw new Error('Unsupported object path notation.');}
				path = path.split('.');
				do{
					if( o === undefined ){return false;}
					stone = path.shift();
					if( !o.hasOwnProperty(stone) ){return false;}
					o = o[stone];
				}while( path.length );
				return true;
			},
			empty:    function(o){if(!o || ($is.string(o) && o == '') || ($is.array(o) && !o.length)){return true;}return false;},
			array:    function(o){return (Array.isArray(o) || typeof o.length === 'number');},
			string:   function(o){return (typeof o == 'string' || o instanceof String);},
			object:   function(o){return (o.constructor.toString().indexOf('function Object()') == 0);},
			element:  function(o){return (!$is.string(o) && 'nodeType' in o && o.nodeType === 1 && 'cloneNode' in o);},
			function: function(o){if(!o){return false;}return (o.constructor.toString().indexOf('function Function()') == 0);},
			formData: function(o){return (o.constructor.toString().indexOf('function FormData()') == 0);}
		};
	}

	var _message = {
		'toPopup': function(responseCallback){
			/* Si envias un message desde background a popup usando onMessage -> sendResponse
			 * y la respuesta es asíncrona puede que para cuando se vaya a llamar a sendResponse
			 * ya no exista la ventana y dé un pete. Para evitarlo podemos comprobar si existe
			 * previamente la ventana de popup */
			var views = chrome.extension.getViews({type:'popup'});
			if( views.length ){
				responseCallback();
			}
		},
		'send': function(responseCallback){
			/* Si envias un message desde background a popup usando onMessage -> sendResponse
			 * y la respuesta es asíncrona puede que para cuando se vaya a llamar a sendResponse
			 * ya no exista la ventana y dé un pete. Para evitarlo usamos try/catch */
			return new Promise(function (resolve, reject) {
				try{
					responseCallback();
					resolve({});
				}catch(e){
					reject(e);
				}
			});
		}
	};

	var _tenminutemail = function(params){
		if( !params ){params = {};}
		this.address = false;
		this.dswid   = false;
		this._inverval_keepalive = false;
		this._inverval_count     = false;
		this._inverval_keepalive_function = false;
		this._inverval_count_function     = false;
		this._mail_count         = 0;
		this._callbacks          = {};
		this._messages           = [];
		if( params.address ){this.address = params.address;}
		if( params.dswid   ){this.dswid   = params.dswid;}

		this._inverval_keepalive_function = function(){
			this.keepalive().then(function(){},function(){});
		}.bind(this);
		this._inverval_count_function = function(){
			this.count().then(function(count){
				if( count > this._mail_count ){
					this.messages().then(function(){
						if( ('new-mail' in this._callbacks) ){
							this._callbacks['new-mail'](this._messages[this._messages.length - 1]);
						}	
					}.bind(this),function(){
						//TODO
					});
				}
				this._mail_count = count;
			}.bind(this),function(){
				//TODO
			});
		}.bind(this);

		if( this.address && this.dswid ){
			//FIXME: comprobar de alguna manera, con create por ejemplo
			this._inverval_keepalive = setInterval(this._inverval_keepalive_function,20000);
			this._inverval_count     = setInterval(this._inverval_count_function,10000);
			/* Update now the count of mails */
			this._inverval_count_function();
		}
	};
	_tenminutemail.prototype.addEventListener = function(name,callback){
		/* new-mail: When new_count of mails > old_count of mails
		 * keepalive: When the lib calls for reset successfully */
		this._callbacks[name] = callback;
		if( name == 'new-mail' && this._mail_count ){
			this._callbacks['new-mail'](this._messages[this._messages.length - 1]);
		}
	};
	_tenminutemail.prototype.create = function(){
		return new Promise(function (resolve, reject) {
			var _url = 'https://10minutemail.com';
			$ajax(_url,{'_cache':false},{
				'onEnd': function(text,headers){
					//console.log(headers);
					var _match_address = false;
					if( !_match_address ){_match_address = /<input type="text" value="([^"]+)" class="mail\-address\-address"[^>]*/.exec(text);}

					var _match_dswid = false;
					if( !_match_dswid ){_match_dswid = /dswid=([0-9\-]+)/.exec(text);}

					if( !!_match_address && !!_match_dswid ){
						this.address = _match_address[1];
						this.dswid   = _match_dswid[1];

						this._inverval_keepalive = setInterval(this._inverval_keepalive_function,30000);
						this._inverval_count     = setInterval(this._inverval_count_function,8000);
						/* Update now the count of mails */
						this._inverval_count_function();
						return resolve({'address':this.address,'dswid':this.dswid});
					}
					return reject({'error':'UNKNOWN_ERROR'});
				}.bind(this)
			});
		}.bind(this));
	};
	_tenminutemail.prototype.destroy = function(){
		return new Promise(function (resolve, reject) {
			chrome.cookies.getAll({domain:'10minutemail.com'}, function(cookies) {
				for( var i = 0; i < cookies.length; i++ ){
					chrome.cookies.remove({url: 'https://10minutemail.com' + cookies[i].path, name: cookies[i].name});
				}
			});

			/* Remove intervals */
			clearInterval(this._inverval_keepalive);
			clearInterval(this._inverval_count);
			this.address = false;
			this.dswid   = false;
			this._inverval_keepalive = false;
			this._inverval_count     = false;
			this._mail_count         = 0;
			this._messages           = [];
			resolve({});
		}.bind(this));
	};
	_tenminutemail.prototype.keepalive = function(){
		return new Promise(function (resolve, reject) {
			var _url = 'https://10minutemail.com/10MinuteMail/resources/session/reset';
			$ajax(_url,{'_cache':false},{
				'onEnd': function(text,headers){
					if( text != 'reset' ){
						return reject({'error':'UNKNOWN_ERROR'});
					}
					//console.log(text);

					if( ('keepalive' in this._callbacks) ){this._callbacks['keepalive']();}
					return resolve({});
				}.bind(this)
			});
		}.bind(this));
	};
	_tenminutemail.prototype.count = function(){
		return new Promise(function (resolve, reject) {
			var _url = 'https://10minutemail.com/10MinuteMail/resources/messages/messageCount';
			$ajax(_url,{'_cache':false},{
				'onEnd': function(text,headers){
					return resolve(text);
				}
			});
		}.bind(this));
	};
	_tenminutemail.prototype.messages = function(){
		return new Promise(function (resolve, reject) {
			var _url = 'https://10minutemail.com/10MinuteMail/resources/messages/messagesAfter/0';
			$ajax(_url,{'_cache':false},{
				'onEnd': function(text,headers){
					this._messages = JSON.parse(text);
					return resolve(this._messages);
				}.bind(this)
			});
		}.bind(this));
	};






