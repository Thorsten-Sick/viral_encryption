/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Gmail Conversation View
 *
 * The Initial Developer of the Original Code is
 * Mozilla messaging
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// Code from the paranoia plugin:
// tls-paranoia@gdr.name


window.addEventListener("load", function _overlay_eventListener () {

  startup(); 

  /* Parse RFC-2822 header */
  function paranoiaParseHeaderString(headersStr) {
	  var hdrLines = headersStr.split("\r\n");
	  var headers = Array();
	  var currentHeader = "";

	  hdrLines.forEach(function(line, number, all) {
		  if(line[0] == " " || line[0] == "\t") {
			  currentHeader += " " + line.replace(/^\s+|\s+$/g, '');
		  }
		  else
	  {
		  if(currentHeader.length > 0) {
			if (currentHeader.search(/OpenPGP:/) != -1) {  // Remark: Must be at start of header, for testing reasons this regex is wrong
				alert(currentHeader);
			}
	          };
		  currentHeader = line;
	  }
	  });

	  return headers;
  }

  /* Return only 'Received:' headers, parsed to objects */
  function paranoiaGetReceivedHeaders(parsedHeaders) {
	  var received = Array();
	  var rcvdRegexp = /^Received:.*from\s+([^ ]+)\s+.*by ([^ ]+)\s+.*with\s+([A-Z0-9]+).*;.*$/g;
	  var secureMethods = ['SMTPS', 'ESMTPS', 'SMTPSA', 'ESMTPSA'];

	  parsedHeaders.forEach(function(header) {
          var match = rcvdRegexp.exec(header);
          if(match)
          {
			  var local = paranoiaIsHostLocal(match[1]) || 
		          match[1].replace(/^\s+|\s+$/g, '') == match[2].replace(/^\s+|\s+$/g, ''); // trim

			  received.push({
				  from: match[1],
				  to: match[2],
				  method: match[3],
				  local: local,
				  secure: (secureMethods.indexOf(match[3]) != -1),
				  toString: function() {
					  var secureSign = this.secure ? '✓' : '✗';
					  if(this.local) secureSign = '⌂';
					  return secureSign + ' ' + this.method + ": " + this.from + " ==> " + this.to;
				  }
			  });
          }
	  });

	  return received;
  }

  /* Changes 'yandex' to 'Яндекс' */
  function paranoiaGetProviderDisplayName(provider) {
	  var providerDisplayNames = {
		  'yandex' : 'Яндекс',
		  'o2pl' : 'Grupa o2.pl',
		  'onet' : 'Onet.pl',
		  'wp': 'Wirtualna Polska',
		  'gadu': 'Gadu Gadu',
		  'qq': 'QQ',
	  }

	  if(providerDisplayNames[provider]) {
		  return providerDisplayNames[provider];
	  }
	  else {
		  return provider.charAt(0).toUpperCase() + provider.slice(1);
	  }
  }

  /* Finds known email provider from an array of 'Received:' headers */
  function paranoiaGetKnownProviders(receivedHeaders) {
	  known = {
		  'yandex.net' : 'yandex',
		  'yandex.ru' : 'yandex',
		  'go2.pl' : 'o2pl',
		  'tlen.pl' : 'o2pl',
		  'o2.pl' : 'o2pl',
		  'google.com' : 'google',
		  'twitter.com' : 'twitter',
		  'facebook.com' : 'facebook',
		  'mailgun.us' : 'rackspace',
		  'mailgun.org' : 'rackspace',
		  'emailsrvr.com' : 'rackspace',
		  'rackspace.com' : 'rackspace',
		  'dreamhost.com' : 'dreamhost',
		  'linode.com' : 'linode',
		  'messagingengine.com' : 'opera',
		  'fastmail.fm' : 'opera',
		  'fastmail.net' : 'opera',
		  'onet.pl' : 'onet',
		  'sendgrid.com' : 'sendgrid',
		  'sendgrid.net' : 'sendgrid',
		  'wp.pl' : 'wp',
		  'hostgator.com' : 'hostgator',
		  'hostgator.net' : 'hostgator',
		  'interia.pl' : 'interia',
		  'yahoo.com' : 'yahoo',
		  'hotmail.com' : 'hotmail',
		  'qq.com' : 'qq',
		  'gadu-gadu.pl' : 'gadu',
	  };

	  var found = new Array();
	  var domainRegex = /(?:\.|^)([a-z0-9\-]+\.[a-z0-9\-]+)$/g;

	  receivedHeaders.forEach(function(hdr) {
		  match = domainRegex.exec(hdr.from.toLowerCase());
		  if(match)
	      {
			  domain = match[1];
			  if(known[domain] && found.indexOf(known[domain]) == -1) {
				  found.push(known[domain]);
			  }
          }
	  });

	  return found;
  }

  /* Return number of insecure hosts in the path */
  function paranoiaAreReceivedHeadersInsecure(receivedHeaders) {
	  var insecure = 0;
	  var unencryptedLocal = 0;
	  var encrypted = 0;
	  receivedHeaders.forEach(function(header) {
		  Application.console.log(header.from + " - " + header.secure);
          if(!header.secure && !header.local) insecure++;
		  if(!header.secure && header.local) unencryptedLocal++;
		  if(header.secure) encrypted++;
	  });

	  return {
		  'insecure': insecure,
		  'unencryptedLocal': unencryptedLocal,
		  'encrypted': encrypted
	  };
  }

  /* Create a popup menu with all 'Received:' headers */
  function paranoiaCreateReceivedPopup(receivedHeaders) {
	  var popup = document.createElement('menupopup');
	  popup.setAttribute('id', 'paranoiaConnectionList');

	  receivedHeaders.forEach(function(hdr) {
          var item = document.createElement('menuitem');
		  item.setAttribute('label', hdr.toString());
		  popup.appendChild(item);
	  });

	  return popup;
  }

  /* Remove popup from DOM tree, if found */
  function paranoiaRemoveReceivedPopup() {
	  var elem = document.getElementById('paranoiaConnectionList');
	  if(elem) elem.parentNode.removeChild(elem);
  }

  /* Return XULElement with icon - create one if necessary */
  function paranoiaGetHdrIconDOM() {
	  var id = 'paranoiaHdrIcon';
	  if(document.getElementById(id))
	  {
		  return document.getElementById(id);
	  }

	  var parentBox = document.getElementById('dateValueBox'); ///////
	  var previousBox = document.getElementById('smimeBox');

	  var elem = document.createElement('image');
	  elem.setAttribute('id', id);
      elem.onclick = function() {
          document.getElementById('paranoiaConnectionList').openPopup(this, 'after_start', 0, 0, false, false);
      }                       
	  parentBox.insertBefore(elem, previousBox);
	  return elem;
  }

  function paranoiaSetPerfectIcon() {
	  var icon = paranoiaGetHdrIconDOM();
	  icon.setAttribute('style', 'list-style-image: url("chrome://demo/skin/perfect.png")');
      icon.setAttribute('tooltiptext', 'Perfect - no known email providers and encryption between all hops');
	  return icon;
  }

  function paranoiaSetGoodIcon() {
	  var icon = paranoiaGetHdrIconDOM();
	  icon.setAttribute('style', 'list-style-image: url("chrome://demo/skin/good.png")');
      icon.setAttribute('tooltiptext', 'Good - Email passed known providers or was unencrypted only on a local connection');
	  return icon;
  }

  function paranoiaSetBadIcon() {
	  var icon = paranoiaGetHdrIconDOM();
	  icon.setAttribute('style', 'list-style-image: url("chrome://demo/skin/bad.png")');
      icon.setAttribute('tooltiptext', '1 non-local connection on the way was unencrypted');
	  return icon;
  }

  function paranoiaSetTragicIcon() {
	  var icon = paranoiaGetHdrIconDOM();
	  icon.setAttribute('style', 'list-style-image: url("chrome://demo/skin/tragic.png")');
      icon.setAttribute('tooltiptext', 'More than 1 connection on the way was unencrypted');
	  return icon;
  }

  function paranoiaAddProviderIcon(providerName, parentBox) {
	  var previousBox = paranoiaGetHdrIconDOM();

	  var elem = document.createElement('image');
	  elem.setAttribute('class', 'paranoiaProvider');
	  elem.setAttribute('style', 'list-style-image: url("chrome://demo/skin/providers/' + providerName + '.png")');
	  elem.setAttribute('tooltiptext', paranoiaGetProviderDisplayName(providerName));
      parentBox.appendChild(elem);
  }

  function paranoiaAddProviderIcons(providers)
  {
	  var oldIcons = document.getElementsByClassName('paranoiaProviderVbox');
	  var i, len = oldIcons.length;
	  var vbox;

	  for(i = 0; i < len; i++) {
		  var elem = oldIcons[i];
          elem.parentNode.removeChild(elem); 
	  }
	  providers.forEach(function(item, i) {
		  if(i % 2 == 0) {
			  if(vbox) document.getElementById('dateValueBox').insertBefore(vbox, paranoiaGetHdrIconDOM());
              vbox = document.createElement('vbox');
			  vbox.setAttribute('class', 'paranoiaProviderVbox');
		  }
		  paranoiaAddProviderIcon(item, vbox);
	  });
      if(vbox) document.getElementById('dateValueBox').insertBefore(vbox, paranoiaGetHdrIconDOM());
  }

  function paranoiaIsHostLocal(hostname) {
	  if(hostname == 'localhost') return true;
	  if(hostname == '[127.0.0.1]') return true;
	  if(hostname == 'Internal') return true;
	  if(/(^\[10\.)|(^\[172\.1[6-9]\.)|(^\[172\.2[0-9]\.)|(^\[172\.3[0-1]\.)|(^\[192\.168\.)/g.test(hostname)) return true;
	  return false;
  }


function btn_click(e){ 
	var myPanel = document.getElementById("viral-panel");
	myPanel.label = "Stop clicking me!";
	var params = {inn:{name:"foo bar"}, out:null};
	openDialog("chrome://viral/content/install_dialog.xul","", "", params);
}


// Enigmail
// https://addons.mozilla.org/thunderbird/downloads/latest/71/addon-71-latest.xpi
function startup() {
	var myPanel = document.getElementById("viral-panel");
	myPanel.label = "Click me";
	myPanel.onclick = btn_click;

}


// http://stackoverflow.com/questions/5089405/thunderbird-extension-add-field-to-messagepane-how-to-deal-with-windows-instan
/* Add a listener for changed message */
gMessageListeners.push({
	onStartHeaders: function() {
		var msg = gMessageDisplay.displayedMessage;
		if(!msg) return;

		var folder = msg.folder;

		var offset = new Object();
		var messageSize = new Object();

		// https://github.com/clear-code/changequote/blob/0f5a09d3887d97446553d6225cc9f71dc2a75039/content/changequote/changequote.jsh
		// http://thunderbirddocs.blogspot.com/2005/02/thunderbird-extensions-how-to-get-body.html
		try {
			stream = folder.getOfflineFileStream(msg.messageKey, offset, messageSize);
			var scriptableStream=Components.classes["@mozilla.org/scriptableinputstream;1"].getService(Components.interfaces.nsIScriptableInputStream);

			scriptableStream.init(stream);
			var fullBody = scriptableStream.read(msg.messageSize);
			var headersStr = fullBody.substring(0, fullBody.indexOf("\r\n\r\n"));
			scriptableStream.close();
			stream.close();

			headers = paranoiaParseHeaderString(headersStr);
			receivedHeaders = paranoiaGetReceivedHeaders(headers);

			var providers = paranoiaGetKnownProviders(receivedHeaders);

			var security = paranoiaAreReceivedHeadersInsecure(receivedHeaders);
			if(!security.insecure && !security.unencryptedLocal && providers.length == 0) {
				paranoiaSetPerfectIcon();
			}
			else if(!security.insecure) {
				var icon = paranoiaSetGoodIcon();
				if(providers.length > 0 && security.unencryptedLocal > 0) {
					icon.setAttribute('tooltiptext', 'Good: Passed known email providers and the only unencrypted connections were local');
				}
				else {
					if(providers.length > 0) {
						icon.setAttribute('tooltiptext', 'Good: Passed known email providers');
					}
					if(security.unencryptedLocal > 0) {
						icon.setAttribute('tooltiptext', 'Good: The only unencrypted connections were local');
					}
				}
			}
			else if(security.insecure == 1) {
				paranoiaSetBadIcon();
			}
			else {
				paranoiaSetTragicIcon();
			}
			
			paranoiaRemoveReceivedPopup();
            var popup = paranoiaCreateReceivedPopup(receivedHeaders);
			document.getElementById('dateValueBox').appendChild(popup);
			receivedHeaders.forEach(function(hdr) {Application.console.log(hdr);});

			paranoiaAddProviderIcons(providers);
//			paranoiaAddProviderIcon('google');
		}
		catch(e) {
			Application.console.log("PROBLEM: " + e.message);
		}
	},
	onEndHeaders: function() {
	},  
	onEndAttachments: function () {
	},
	onBeforeShowHeaderPane: function () {
	}
});
}, false);

