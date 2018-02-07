// We make use of this 'server' variable to provide the address of the
// REST Janus API. By default, in this example we assume that Janus is
// co-located with the web server hosting the HTML pages but listening
// on a different port (8088, the default for HTTP in Janus), which is
// why we make use of the 'window.location.hostname' base address. Since
// Janus can also do HTTPS, and considering we don't really want to make
// use of HTTP for Janus if your demos are served on HTTPS, we also rely
// on the 'window.location.protocol' prefix to build the variable, in
// particular to also change the port used to contact Janus (8088 for
// HTTP and 8089 for HTTPS, if enabled).
// In case you place Janus behind an Apache frontend (as we did on the
// online demos at http://janus.conf.meetecho.com) you can just use a
// relative path for the variable, e.g.:
//
// 		var server = "/janus";
//
// which will take care of this on its own.
//
//
// If you want to use the WebSockets frontend to Janus, instead, you'll
// have to pass a different kind of address, e.g.:
//
// 		var server = "ws://" + window.location.hostname + ":8188";
//
// Of course this assumes that support for WebSockets has been built in
// when compiling the gateway. WebSockets support has not been tested
// as much as the REST API, so handle with care!
//
//
// If you have multiple options available, and want to let the library
// autodetect the best way to contact your gateway (or pool of gateways),
// you can also pass an array of servers, e.g., to provide alternative
// means of access (e.g., try WebSockets first and, if that fails, fall
// back to plain HTTP) or just have failover servers:
//
//		var server = [
//			"ws://" + window.location.hostname + ":8188",
//			"/janus"
//		];
//
// This will tell the library to try connecting to each of the servers
// in the presented order. The first working server will be used for
// the whole session.
//
var server = "/janus";
//if(window.location.protocol === 'http:')
//	server = "http://" + window.location.hostname + ":8088/janus";
//else
//	server = "https://" + window.location.hostname + ":8089/janus";
//var socket = window.socket;
var janus = null;
var textroom = null;
var opaqueId = "textroomtest-"+Janus.randomString(12);


var started = false;

//var myroom = null;	// Demo room
//var myusername = null;
var myid = null;
var participants = {};
var transactions = {};

var mystream = null;
var mypvtid = null;

var feeds = [];
var bitrateTimer = [];

//$(document).ready(function() {
function initJanus(myusername, myroom){
   myusername = myusername;
   myroom = myroom;
	// Initialize the library (all console debuggers enabled)
	Janus.init({debug: "all", callback: function() {
		// Use a button to start the demo
		//$('#start').click(function() {
			if(started)
				return;
			started = true;
			$(this).attr('disabled', true).unbind('click');
			// Make sure the browser supports WebRTC
			if(!Janus.isWebrtcSupported()) {
				alert("No WebRTC support... ");
				return;
			}
			// Create session
			janus = new Janus({
               
				server: server,
            iceServers: [{url: "turn:numb.viagenie.ca", username: "dwmarx@ucsc.edu", credential: "slug"}],
				success: function() {
               
					// Attach to text room plugin
					janus.attach({
						plugin: "janus.plugin.textroom",
						opaqueId: opaqueId,
						success: function(pluginHandle) {
							textroom = pluginHandle;
							Janus.log("Plugin attached! (" + textroom.getPlugin() + ", id=" + textroom.getId() + ")");
							
                     // Setup the DataChannel
							var body = { "request": "setup" };
							Janus.debug("Sending message (" + JSON.stringify(body) + ")");
							textroom.send({"message": body});
							//$('#start').removeAttr('disabled').html("Stop").click(function() {
							//	 $(this).attr('disabled', true);
							//	janus.destroy();
						   //});
                      var createRoom = {
                         "request": "create",
                         "room": myroom,
                     };
                     textroom.send({"message": createRoom});
						},
						error: function(error) {
                     console.error("  -- Error attaching plugin...", error);
						   alert("janus connection error: " + error);
					   },
						webrtcState: function(on) {
							Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
						},
						onmessage: function(msg, jsep) {
							Janus.debug(" ::: Got a message :::");
							Janus.debug(JSON.stringify(msg));
							if(msg["error"] !== undefined && msg["error"] !== null) alert(msg["error"]);
						
						   if(jsep !== undefined && jsep !== null) {							
                        
                        // Answer
							   textroom.createAnswer({
                           jsep: jsep,
                           media: { audio: false, video: false, data: true },	// We only use datachannels
                           success: function(jsep) {
                              Janus.debug("Got SDP!");
                              Janus.debug(jsep);
                              var body = { "request": "ack" };
                              textroom.send({"message": body, "jsep": jsep});
                           },
                           error: function(error) {
                              Janus.error("WebRTC error:", error);
                              bootbolox.alert("WebRTC error... " + JSON.stringify(error));
                           }
                        });
                     }
                  },
                  ondataopen: function(data) {
                     Janus.log("The DataChannel is available!");
                     //$('#dragonspin').addClass('w3-hide');
                     // Prompt for a display name to join the default room
                     //$('#roomjoin').removeClass('w3-hide');
                     //$('#registernow').removeClass('w3-hide').show();
                     //$('#register').click(registerUsername);
                     //$('#username').focus();
                     registerUsername(myusername, myroom);
                  },
                  ondata: function(data) {
                     Janus.debug("We got data from the DataChannel! " + data);
                     //~ $('#datarecv').val(data);
                     var json = JSON.parse(data);
                     var transaction = json["transaction"];
                     if(transactions[transaction]) {
                        // Someone was waiting for this
                        transactions[transaction](json);
                        delete transactions[transaction];
                        return;
                     }
                     var what = json["textroom"];
                     if(what === "message") {
                        // Incoming message: public or private?
                        var whisper = json["whisper"];
                        var msgjson = JSON.parse(json["text"]);
                        var msg = msgjson["text"];
                        msg = msg.replace(new RegExp('<', 'g'), '&lt');
                        msg = msg.replace(new RegExp('>', 'g'), '&gt');
                        var from = json["from"];
                        var dateString = msgjson["time"];
                        var whisper = msgjson["to"];
                        //var roll = json["roll"];
                        var type = msgjson["type"];
                        if(whisper) {
                           // Private message
                           $('#chatroom').append('<p style="color: purple;">[' + dateString + '] <b>[whisper from ' + participants[from] + ']</b> ' + msg);
                           $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
                        }else if ( type === "roll"){
                           $('#chatroom').append('<p style="color: red;">[' + dateString + '] <b>' + participants[from] + '</b> ' + msg);
                           $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
                        }else if( type === "emote"){
							$('#chatroom').append('<p style="color: green;">[' + dateString + '] <b>' + participants[from] + '</b> ' + msg + ".");
                           $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
						}
						else {
                           $('#chatroom').append('<p style="color: black;">[' + dateString + '] <b>' + participants[from] + ':</b> ' + msg);
                           $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
                        }
                     }else if(what === "join") {
                        // Somebody joined
                        var username = json["username"];
                        var display = json["display"];
                        participants[username] = display ? display : username;
                        if(username !== myid && $('#rp' + username).length === 0) {
                           // Add to the participants list
                           $('#list').append('<li id="rp' + username + '" class="list-group-item">' + participants[username] + '</li>');
                           $('#rp' + username).css('cursor', 'pointer').click(function() {
                              var username = $(this).attr('id').split("rp")[1];
                              sendPrivateMsg($('#myname').html(), username, myroom);
                           });
                        }         
                        $('#chatroom').append('<p style="color: green;">[' + getDateString() + '] <i>' + participants[username] + ' joined</i></p>');
                        $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
                  
                     }else if(what === "leave") {
                     
                        // Somebody left
                        var username = json["username"];
                        var when = new Date();
                        $('#rp' + username).remove();
                        $('#chatroom').append('<p style="color: green;">[' + getDateString() + '] <i>' + participants[username] + ' left</i></p>');
                        $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
                        delete participants[username];
                     
                     }else if(what === "kicked") {
                        // Somebody was kicked
                        var username = json["username"];
                        var when = new Date();
                        $('#rp' + username).remove();
                        $('#chatroom').append('<p style="color: green;">[' + getDateString() + '] <i>' + participants[username] + ' was kicked from the room</i></p>');
                        $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
                        delete participants[username];
                        if(username === myid) {
                           alert("You have been kicked from the room"); 
                           window.location.reload();
                        }
                     }else if(what === "destroyed") {
                        if(json["room"] !== myroom) return;
                        // Room was destroyed, goodbye!
                        Janus.warn("The room has been destroyed!");
                        alert("The room has been destroyed");
                        window.location.reload();
                     }                 
                  },
                  oncleanup: function() {
                     Janus.log(" ::: Got a cleanup notification :::");
                     $('#datasend').attr('disabled', true);
                  }
               });
               janus.attach({
                  plugin: "janus.plugin.videoroom",
                  opaqueId: opaqueId,
                  success: function(pluginHandle) {
                     $('#details').remove();
                     sfutest = pluginHandle;
                     Janus.log("Plugin attached! (" + sfutest.getPlugin() + ", id=" + sfutest.getId() + ")");
                     Janus.log("  -- This is a publisher/manager");
                     // Prepare the username registration
                     //('#videojoin').removeClass('hide').show();
                     //$('#registernow').removeClass('hide').show();
                     //$('#register').click(registerUsername);
                     //$('#username').focus();
                     //$('#start').removeAttr('disabled').html("Stop")
                     //	.click(function() {
                     //		$(this).attr('disabled', true);
                     //		janus.destroy();
                     //	});
                     var createRoom = {
                         "request": "create",
                         "record": true,
                         "publishers": 6,
                         "room": myroom
                         //"bitrate": bandwidth,
                     };
                     sfutest.send({"message": createRoom});
                  },
                  error: function(error) {
                     Janus.error("  -- Error attaching plugin...", error);
                     alert("Error attaching plugin... " + error);
                  },
                  consentDialog: function(on) {
                     Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
                     if(on) {
                        // Darken screen and show hint
                        $.blockUI({ 
                           message: '<div><img src="up_arrow.png"/></div>',
                           css: {
                              border: 'none',
                              padding: '15px',
                              backgroundColor: 'transparent',
                              color: '#aaa',
                              top: '10px',
                              left: (navigator.mozGetUserMedia ? '-100px' : '300px')
                           } });
                     } else {
                        // Restore screen
                        $.unblockUI();
                     }
                  },
                  mediaState: function(medium, on) {
                     Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
                  },
                  webrtcState: function(on) {
                     Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                     $("#videolocal").parent().parent().unblock();
                  },
                  onmessage: function(msg, jsep) {
                     Janus.debug(" ::: Got a message (publisher) :::");
                     Janus.debug(JSON.stringify(msg));
                     var event = msg["videoroom"];
                     Janus.debug("Event: " + event);
                     if(event != undefined && event != null) {
                        if(event === "joined") {
                           // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                           myid = msg["id"];
                           mypvtid = msg["private_id"];
                           Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                           $('#videolocal').html('<button id="publish" class="w3-btn w3-green w3-tiny">Publish</button>');
                           $('#publish').click(function() { publishOwnFeed(true, true); });
						   //publishOwnFeed(true, true);
						   //unpublishOwnFeed();
                           // Any new feed to attach to?
                           if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                              var list = msg["publishers"];
                              Janus.debug("Got a list of available publishers/feeds:");
                              Janus.debug(list);
                              for(var f in list) {
                                 var id = list[f]["id"];
                                 var display = list[f]["display"];
                                 Janus.debug("  >> [" + id + "] " + display);
                                 newRemoteFeed(id, display, myroom)
                              }
                           }
                        } else if(event === "destroyed") {
                           // The room has been destroyed
                           Janus.warn("The room has been destroyed!");
                           //alert("The room has been destroyed", function() {
                           //	window.location.reload();
                           //});
                        }else if(event === "event") {
                           // Any new feed to attach to?
                           if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                              var list = msg["publishers"];
                              Janus.debug("Got a list of available publishers/feeds:");
                              Janus.debug(list);
                              for(var f in list) {
                                 var id = list[f]["id"];
                                 var display = list[f]["display"];
                                 Janus.debug("  >> [" + id + "] " + display);
                                 newRemoteFeed(id, display, myroom)
                              }
                           }else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                              // One of the publishers has gone away?
                              var leaving = msg["leaving"];
                              Janus.log("Publisher left: " + leaving);
                              var remoteFeed = null;
                              for(var i=1; i<6; i++) {
                                 if(feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == leaving) {
                                    remoteFeed = feeds[i];
                                    break;
                                 }
                              }
                              if(remoteFeed != null) {
                                 Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                                 $('#remote'+remoteFeed.rfindex).empty().hide();
                                 $('#videoremote'+remoteFeed.rfindex).empty();
                                 feeds[remoteFeed.rfindex] = null;
                                 remoteFeed.detach();
                              }
                           }else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                              // One of the publishers has unpublished?
                              var unpublished = msg["unpublished"];
                              Janus.log("Publisher left: " + unpublished);
                              if(unpublished === 'ok') {
                                 // That's us
                                 sfutest.hangup();
                                 return;
                              }
                              var remoteFeed = null;
                              for(var i=1; i<6; i++) {
                                 if(feeds[i] != null && feeds[i] != undefined && feeds[i].rfid == unpublished) {
                                    remoteFeed = feeds[i];
                                    break;
                                 }
                              }
                              if(remoteFeed != null) {
                                 Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                                 $('#remote'+remoteFeed.rfindex).empty().hide();
                                 $('#videoremote'+remoteFeed.rfindex).empty();
                                 feeds[remoteFeed.rfindex] = null;
                                 remoteFeed.detach();
                              }
                           } else if(msg["error"] !== undefined && msg["error"] !== null) {
                              alert(msg["error"]);
                           }
                        }
                     }
                     if(jsep !== undefined && jsep !== null) {
                        Janus.debug("Handling SDP as well...");
                        Janus.debug(jsep);
                        sfutest.handleRemoteJsep({jsep: jsep});
                     }
                  },
                  onlocalstream: function(stream) {
                     Janus.debug(" ::: Got a local stream :::");
                     mystream = stream;
                     Janus.debug(JSON.stringify(stream));
                     $('#videolocal').empty();
                     $('#videojoin').hide();
                     $('#videos').removeClass('hide').show();
                     if($('#myvideo').length === 0) {
                        $('#videolocal').append('<video class="w3-round-large w3-center" id="myvideo" style="width:60%;height:60%" autoplay muted="muted"/>');
                        // Add a 'mute' button
                        $('#videolocal').append('<button class="w3-btn w3-red w3-tiny" id="mute" style="position: relative; bottom: 0px; right: 0px; margin: 5px;">Mute</button>');
                        $('#mute').click(toggleMute);
                        // Add an 'unpublish' button
                        $('#videolocal').append('<button class="w3-btn w3-red w3-tiny" id="unpublish" style="position: relative; bottom: 0px; left: 0px; margin: 5px;">unpublish</button>');
                        $('#unpublish').click(unpublishOwnFeed);
                     }
                     $('#publisher').removeClass('w3-hide').html(myusername).show();
                     Janus.attachMediaStream($('#myvideo').get(0), stream);
                     $("#myvideo").get(0).muted = "muted";
                     $("#videolocal").parent().parent().block({
                        message: '<b>Publishing...</b>',
                        css: {
                           border: 'none',
                           backgroundColor: 'transparent',
                           color: 'white'
                        }
                     });
                     var videoTracks = stream.getVideoTracks();
                     if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                        // No webcam
                        $('#myvideo').hide();
                        $('#videolocal').append(
                           '<div class="no-video-container">' +
                              '<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
                              '<span class="no-video-text" style="font-size: 16px;">No webcam available</span>' +
                           '</div>');
                     }
                  },
                  onremotestream: function(stream) {
                     // The publisher stream is sendonly, we don't expect anything here
                  },
                  oncleanup: function() {
                     Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
                     mystream = null;
                     $('#videolocal').html('<button id="publish" class="w3-btn w3-green w3-tiny">Publish</button>');
                     $('#publish').click(function() { publishOwnFeed(true, true); });
                     $("#videolocal").parent().parent().unblock();
                  }
               });
      
            },
            error: function(error) {
               Janus.error(error);
               alert(error, function() {
                  window.location.reload();
               });
            },
            destroyed: function() {
               window.location.reload();
            }
         });
		//});
	}});
};

function checkEnter(field, event) {
	var theCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode;
	if(theCode == 13) {
		if(field.id == 'datasend')
			sendData($('#myname').html(),$('#datasend').val(),  1000 + parseInt($('#myroom').html()));
		return false;
	} else {
		return true;
	}
}

function registerUsername(myusername, myroom) {
	//if($('#username').length === 0) {
		// Create fields to register
	//	$('#register').click(registerUsername);
	//	$('#username').focus();
	//} else {
		// Try a registration
		//$('#username').attr('disabled', true);
		//$('#register').attr('disabled', true).unbind('click');
		//var username = $('#username').val();
		/*if(username === "") {
			$('#you')
				.removeClass().addClass('label label-warning')
				.html("Insert your display name (e.g., pippo)");
			$('#username').removeAttr('disabled');
			$('#register').removeAttr('disabled').click(registerUsername);
			return;
		}*/
		myid = randomString(12);
		var transaction = randomString(12);
		var register = {
			textroom: "join",
			transaction: transaction,
			room: myroom,
			username: myid,
			display: myusername
		};
		//myusername = username;
		transactions[transaction] = function(response) {
			if(response["textroom"] === "error") {
				// Something went wrong
				alert(response["error"]);
				//$('#username').removeAttr('disabled').val("");
				//$('#register').removeAttr('disabled').click(registerUsername);
				return;
			}
			// We're in
			$('#spincontainer').addClass('w3-hide');
			$('#room').removeClass('w3-hide');
         //window.location = '/start';
			$('#participant').html(myusername).show();
         
			//$('#chatroom').css('height', ($(window).height()-420)+"px");
			$('#datasend').removeAttr('disabled');
			// Any participants already in?
			console.log("Participants:", response.participants);
			if(response.participants && response.participants.length > 0) {
				for(var i in response.participants) {
					var p = response.participants[i];
					participants[p.username] = p.display ? p.display : p.username;
					if(p.username !== myid && $('#rp' + p.username).length === 0) {
						// Add to the participants list
						$('#list').append('<li id="rp' + p.username + '" class="list-group-item">' + participants[p.username] + '</li>');
						$('#rp' + p.username).css('cursor', 'pointer').click(function() {
							var username = $(this).attr('id').split("rp")[1];
							sendPrivateMsg($('#myname').html(), username, $('#datasend').val(), myroom);
						});
					}
					$('#chatroom').append('<p style="color: green;">[' + getDateString() + '] <i>' + participants[p.username] + ' joined</i></p>');
					$('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
				}
			}
		};
		textroom.data({
			text: JSON.stringify(register),
			error: function(reason) {
				alert(reason);
				//$('#username').removeAttr('disabled').val("");
				//$('#register').removeAttr('disabled').click(registerUsername);
			}
		});
      var registervideo = { "request": "join", "room": myroom, "ptype": "publisher", "display": myusername };
     // myusername = username;
		sfutest.send({"message": registervideo});
      
	//}
}

function sendPrivateMsg(myusername, username, result, myroom) {
	var display = participants[username];
	if(!display) return;
	//prompt("Private message to " + display);
   //var result = $('#datasend').val();

		if(result && result !== "") {
         var privJSON = {text: result, to: display, from: myusername, room: myroom};
         privJSON.time = getDateString();
         
         if (result.charAt(0)=='/'){
           privJSON.roll = true;
           privJSON.text = "rolled 1d20 and got "+rollDie(20);
         } 
         else privJSON.roll = false;
         lokiStr = JSON.stringify(privJSON);
			var message = {
				textroom: "message",
				transaction: randomString(12),
				room: myroom,
				to: username,
				text: lokiStr,
	   	};
         var msgStr = JSON.stringify(message);
			textroom.data({
				text: msgStr,
				error: function(reason) { alert(reason); },
				success: function() {
               if (privJSON.roll==false){
					   $('#chatroom').append('<p style="color: purple;">[' + privJSON.time + '] <b>[whisper to ' + display + ']</b> ' + result);
					   $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
               }else{
                  $('#chatroom').append('<p style="color: orange;">[' + privJSON.time + '] <b>[whisper to ' + display + ']</b> ' + result);
					   $('#chatroom').get(0).scrollTop = $('#chatroom').get(0).scrollHeight;
               }
				}
			});
         sendLoki(lokiStr);
		} 
      $('#datasend').val() = "";
	return;
}

function sendData(myusername, data, myroom) {
	//var data = $('#datasend').val();
      
	if(data === "") {
		alert('Insert a message to send on the DataChannel');
		return;
	}
	var sendDataJSON = inputParseToJSON(myusername, data, myroom);
   /*sendDataJSON = {text: data, from: myusername, room: myroom};
   sendDataJSON.time = getDateString();
    if(data.charAt(0)=="/" && data.charAt(1)=="r") {
	  
	  
	  var r = data.indexOf("r");
	  var d = data.indexOf("d");
	  var plus = data.indexOf("+");
	  
          console.log("index of plus: " + plus);
	  if(plus == -1){plus = data.length;}
	  console.log("index of plus: " + plus);
	  
          var numRolls = +data.slice(r+1, d).trim();
	  var sides = +data.slice(d+1, plus).trim();
	  var modifier = +data.slice(plus+1).trim();
	  
	  console.log("numRolls: " + numRolls)
	  console.log("sides: " + sides)
	  console.log("modifier: " + modifier)
	  
	  if(!sides || sides == 0 || sides == "NaN"){ sides = 6;}
	  if(!numRolls || numRolls == 0 || numRolls == "NaN") {numRolls = 1;}
      if(!modifier || modifier == "NaN") {modifier = 0;}
	  
      sendDataJSON.roll = true;
      sendDataJSON.text = "rolled " + numRolls + "d" + sides + "+" + modifier + " and got: " + rollDie(numRolls, sides, modifier) + ".";
   } */
//   else if(data.charAt(0)=="/" && data.charAt(1)=="m" && data.charAt(2)=="e"){
//	sendDataJSON.text = data;
//   }
//   else sendDataJSON.roll = false;
   
   var lokiStr = JSON.stringify(sendDataJSON);
	var message = {
		textroom: "message",
		transaction: randomString(12),
		room: myroom,
 		text: lokiStr,
	};
	// Note: messages are always acknowledged by default. This means that you'll
	// always receive a confirmation back that the message has been received by the
	// server and forwarded to the recipients. If you do not want this to happen,
	// just add an ack:false property to the message above, and server won't send
	// you a response (meaning you just have to hope it succeeded).
	var msgStr = JSON.stringify(message);
   textroom.data({
		text: msgStr,
		error: function(reason) { alert(reason); },
		success: function() { $('#datasend').val(''); }
	});
   sendLoki(lokiStr);
}

// Helper to format times
function getDateString(jsonDate) {
	var when = new Date();
	if(jsonDate) {
		when = new Date(Date.parse(jsonDate));
	}
	var dateString =
			("0" + when.getUTCHours()).slice(-2) + ":" +
			("0" + when.getUTCMinutes()).slice(-2) + ":" +
			("0" + when.getUTCSeconds()).slice(-2);
	return dateString;
}

// Just an helper to generate random usernames
function randomString(len, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
    	var randomPoz = Math.floor(Math.random() * charSet.length);
    	randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}
function publishOwnFeed(useAudio, useVideo) {
	// Publish our stream
	$('#publish').attr('disabled', true).unbind('click');
	sfutest.createOffer(
		{
			// Add data:true here if you want to publish datachannels as well
			media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: useVideo },	// Publishers are sendonly
			success: function(jsep) {
				Janus.debug("Got publisher SDP!");
				Janus.debug(jsep);
				var publish = { "request": "configure", "audio": useAudio, "video": useVideo };
				sfutest.send({"message": publish, "jsep": jsep});
			},
			error: function(error) {
				Janus.error("WebRTC error:", error);
				if (useAudio) {
					 publishOwnFeed(false, useVideo);
				} else {
					alert("WebRTC error... " + JSON.stringify(error));
					$('#publish').removeAttr('disabled').click(function() { publishOwnFeed(true, true); });
				}
			}
		});
}

function toggleMute() {
	var muted = sfutest.isAudioMuted();
	Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
	if(muted)
		sfutest.unmuteAudio();
	else
		sfutest.muteAudio();
	muted = sfutest.isAudioMuted();
	$('#mute').html(muted ? "Unmute" : "Mute");
}

function unpublishOwnFeed() {
	// Unpublish our stream
	$('#unpublish').attr('disabled', true).unbind('click');
	var unpublish = { "request": "unpublish" };
	sfutest.send({"message": unpublish});
}

function newRemoteFeed(id, display, myroom) {
	// A new feed has been published, create a new plugin handle and attach to it as a listener
	var remoteFeed = null;
	janus.attach(
		{
			plugin: "janus.plugin.videoroom",
			opaqueId: opaqueId,
			success: function(pluginHandle) {
				remoteFeed = pluginHandle;
				Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
				Janus.log("  -- This is a subscriber");
				// We wait for the plugin to send us an offer
				var listen = { "request": "join", "room": myroom, "ptype": "listener", "feed": id, "private_id": mypvtid };
				remoteFeed.send({"message": listen});
			},
			error: function(error) {
				Janus.error("  -- Error attaching plugin...", error);
				bootbox.alert("Error attaching plugin... " + error);
			},
			onmessage: function(msg, jsep) {
				Janus.debug(" ::: Got a message (listener) :::");
				Janus.debug(JSON.stringify(msg));
				var event = msg["videoroom"];
				Janus.debug("Event: " + event);
				if(event != undefined && event != null) {
					if(event === "attached") {
						// Subscriber created and attached
						for(var i=1;i<6;i++) {
							if(feeds[i] === undefined || feeds[i] === null) {
								feeds[i] = remoteFeed;
								remoteFeed.rfindex = i;
								break;
							}
						}
						remoteFeed.rfid = msg["id"];
						remoteFeed.rfdisplay = msg["display"]; //username!
						//if(remoteFeed.spinner === undefined || remoteFeed.spinner === null) {
						//	var target = document.getElementById('videoremote'+remoteFeed.rfindex);
						//	remoteFeed.spinner = new Spinner({top:100}).spin(target);
						//} else {
						//	remoteFeed.spinner.spin();
						//}
						Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
						$('#remote'+remoteFeed.rfindex).removeClass('w3-hide').html(remoteFeed.rfdisplay).show();
						var playerUpdateRequest = {index: remoteFeed.rfindex, username: remoteFeed.rfdisplay};
						window.socket.emit('request update player', playerUpdateRequest);

					} else if(msg["error"] !== undefined && msg["error"] !== null) {
						alert(msg["error"]);
					} else {
						// What has just happened?
					}
				}
				if(jsep !== undefined && jsep !== null) {
					Janus.debug("Handling SDP as well...");
					Janus.debug(jsep);
					// Answer and attach
					remoteFeed.createAnswer(
						{
							jsep: jsep,
							// Add data:true here if you want to subscribe to datachannels as well
							// (obviously only works if the publisher offered them in the first place)
							media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
							success: function(jsep) {
								Janus.debug("Got SDP!");
								Janus.debug(jsep);
								var body = { "request": "start", "room": myroom };
								remoteFeed.send({"message": body, "jsep": jsep});
							},
							error: function(error) {
								Janus.error("WebRTC error:", error);
								alert("WebRTC error... " + JSON.stringify(error));
							}
						});
				}
			},
			webrtcState: function(on) {
				Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
			},
			onlocalstream: function(stream) {
				// The subscriber stream is recvonly, we don't expect anything here
			},
			onremotestream: function(stream) {
				Janus.debug("Remote feed #" + remoteFeed.rfindex);
				if($('#remotevideo'+remoteFeed.rfindex).length === 0) {
					// No remote video yet
					$('#videoremote'+remoteFeed.rfindex).append('<video class="w3-round-large w3-center" id="waitingvideo' + remoteFeed.rfindex + '" width=60%; height=60% />');
					$('#videoremote'+remoteFeed.rfindex).append('<video style="width:80%;height:40% class="w3-round-large w3-center" id="remotevideo' + remoteFeed.rfindex + '"autoplay/>');
					$('#videoremote'+remoteFeed.rfindex).append('<p>username: ' +remoteFeed.rfdisplay+'</p>');
					//get the 
				}
				//$('#videoremote'+remoteFeed.rfindex).append(
				//	'<span class="label label-primary w3-hide" id="curres'+remoteFeed.rfindex+'" style="position: relative; top: 0px; right: 0px; margin: 5px;"></span>' +
				//	'<span class="label label-info w3-hide" id="curbitrate'+remoteFeed.rfindex+'" style="position: relative; top: 0px; left: 0px; margin: 5px;"></span>');
				// Show the video, hide the spinner and show the resolution when we get a playing event
				$("#remotevideo"+remoteFeed.rfindex).bind("playing", function () {
					if(remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
						remoteFeed.spinner.stop();
					remoteFeed.spinner = null;
					$('#waitingvideo'+remoteFeed.rfindex).remove();
					$('#remotevideo'+remoteFeed.rfindex).removeClass('w3-hide');
					var width = this.videoWidth;
					var height = this.videoHeight;
					$('#curres'+remoteFeed.rfindex).removeClass('w3-hide').text(width+'x'+height).show();
					if(adapter.browserDetails.browser === "firefox") {
						// Firefox Stable has a bug: width and height are not immediately available after a playing
						setTimeout(function() {
							var width = $("#remotevideo"+remoteFeed.rfindex).get(0).videoWidth;
							var height = $("#remotevideo"+remoteFeed.rfindex).get(0).videoHeight;
							$('#curres'+remoteFeed.rfindex).removeClass('w3-hide').text(width+'x'+height).show();
						}, 2000);
					}
				});
				Janus.attachMediaStream($('#remotevideo'+remoteFeed.rfindex).get(0), stream);
				var videoTracks = stream.getVideoTracks();
				if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0 || videoTracks[0].muted) {
					// No remote video
					$('#remotevideo'+remoteFeed.rfindex).hide();
					$('#videoremote'+remoteFeed.rfindex).append(
						'<div class="no-video-container">' +
							'<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
							'<span class="no-video-text" style="font-size: 16px;">No remote video available</span>' +
						'</div>');
				}
				if(adapter.browserDetails.browser === "chrome" || adapter.browserDetails.browser === "firefox") {
					$('#curbitrate'+remoteFeed.rfindex).removeClass('w3-hide').show();
					bitrateTimer[remoteFeed.rfindex] = setInterval(function() {
						// Display updated bitrate, if supported
						var bitrate = remoteFeed.getBitrate();
						$('#curbitrate'+remoteFeed.rfindex).text(bitrate);
					}, 1000);
				}
			},
			oncleanup: function() {
				Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
				if(remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
					remoteFeed.spinner.stop();
				remoteFeed.spinner = null;
				$('#waitingvideo'+remoteFeed.rfindex).remove();
				$('#curbitrate'+remoteFeed.rfindex).remove();
				$('#curres'+remoteFeed.rfindex).remove();
				if(bitrateTimer[remoteFeed.rfindex] !== null && bitrateTimer[remoteFeed.rfindex] !== null) 
					clearInterval(bitrateTimer[remoteFeed.rfindex]);
				bitrateTimer[remoteFeed.rfindex] = null;
			}
		});
}
  function rollDie(numRolls, sides, modifier)
  {
    
     var dieRoll = Math.floor(Math.random() * sides) + 1;
	 var dieTotal = rollDice(numRolls, sides) + modifier;
	 return dieTotal;
  }

function roll(sides){
     if (!sides) sides = 6;
     return Math.floor(Math.random() * sides) + 1;
  }

  function rollDice(numRolls, sides)
  {
    var total = 0;
    while(numRolls-- > 0) total += roll(sides);
    return total;
  }
function sendLoki(jsonStr){
       console.log(jsonStr);
       $.ajax({
          url: '/chat', 
          type: 'POST', 
          contentType: 'application/json', 
          data: jsonStr,
          success: function(data){ console.log(jsonStr); },
          error: function(jqXHR, textStatus, err){
             //var errmsg = JSON.parse(jqXHR.responseText );
             console.warn(jqXHR.responseText);
	 }
      })
}
