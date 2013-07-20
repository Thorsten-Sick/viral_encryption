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

          var pgp = false;
          var sender = ""

	  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService);
	  prefs = prefs.getBranch("extensions.viral.");
          if (prefs.getBoolPref("installed")){ 
              // The user has already been asked once
              return;
          }

	  hdrLines.forEach(function(line, number, all) {
		  if(line[0] == " " || line[0] == "\t") {
			  currentHeader += " " + line.replace(/^\s+|\s+$/g, '');
		  }
		  else
	  {
		  if(currentHeader.length > 0) {
			if (currentHeader.search(/OpenPGP:/) != -1) {  // Remark: Must be at start of header, for testing reasons this regex is wrong
				pgp=true;
			}
                        if (currentHeader.search(/^From: /) != -1) { 
				sender = currentHeader.slice(5);
			}
	          };
		  currentHeader = line;
	  }
	  });
          if (pgp){
	      try{
		      if (prefs.getBoolPref("asked_for_"+sender)) {
		       // Asked for this person already
		       return;
		      }
		}
              catch (e){}

              prefs.setBoolPref("asked_for_"+sender, true);
              var params = {inn:{name:sender}, out:null};
		openDialog("chrome://viral/content/install_dialog.xul","", "", params);
              
          }
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

			paranoiaParseHeaderString(headersStr);			
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

