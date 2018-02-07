var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var loki     = require('lokijs');
var database = new loki('test.loki', { autoload: true, autosave: true });
var users = database.addCollection("users", {unique: ['username']});
var rooms = database.addCollection("rooms", {disableChangesApi: false, unique:['gametitle']});
var character = require('./character.js');

var myCharacter = new character.createEmpty();
myCharacter.name = "derp";
myCharacter.owner = "gandalf";
var gandalf = users.insert({username: "gandalf", password: "loki", characters: [myCharacter], emails:['123@abc.net']});
//var defaultroom = rooms.insert({gametitle: 'fips and dragons', secret: '1234', owner: gandalf.username , players: [], playerLimit: 6, messages: []});


// Create a new Express application.
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

io.on('connection', function(socket){
  console.log('a user connected');
  var socketRoom;
  socket.on('room', function(room){
	  socketRoom = room;
	  socket.join(room);
  });
  socket.on('DM stfu', function(){
	  console.log('dm stfu');
	 io.to(socketRoom).emit('player stfu'); 
  });
  socket.on('DM clear', function(myroom){
	 var clearroom = rooms.findOne({$loki: myroom - 1000});
	 clearroom.messages = [];
	 rooms.update(clearroom);
	 io.to(socketRoom).emit('clear log');
  });
  socket.on('request update player', function(playerUpdateRequest){
     var userJSON = users.findOne({username: playerUpdateRequest.username});
	 var playerUpdate = {character: userJSON.characters[0], index: playerUpdateRequest.index};
	 io.to(socketRoom).emit('update player', playerUpdate); 
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});
// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new LocalStrategy(
  function(username, password, cb) {
      var user = users.findOne({username: username});
      if (!user) { 
         //io.emit('loginfail', {message: 'incorrect username'});
         return cb(null, false, {message:'incorrect username'}); 
      }
      if (user.password != password) { 
         //io.emit('loginfail', {message:'incorrect password'}); 
         return cb(null, false, {message:'incorrect password'}); 
      }
      return cb(null, user, {message: ""});
  }));
  
passport.use(new FacebookStrategy({
        // pull in our app id and secret from our auth.js file
        clientID        : '130755330827692',
        clientSecret    : 'd5ae4abed7ff74ca835556b31478fde4',
        callbackURL     : "https://dragoncircle.top/auth/facebook/callback"
    },
    // facebook will send back the token and profile
    function(token, refreshToken, profile, done) {
        // asynchronous
        process.nextTick(function() {
            console.log(profile);
			// find the user in the database based on their facebook id
            var user = users.findOne({ username : profile.displayName });
                 
            if (user) {
                    return done(null, user); // user found, return that user
            } else {
                    // if there is no user found with that facebook id, create the
					var newUser = users.insert(new freshUser(profile.displayName));
                    // set all of the facebook information in our user model
                    //newUser.facebook.id    = profile.id; // set the users facebook id                   
                    //newUser.facebook.token = token; // we will save the token that facebook provides to the user                    
                    //newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                    //newUser.emails.push(profile.emails[0].value); // facebook can return multiple emails so we'll take the first
                    // save our user to the database
                    users.update(newUser);
            }
        });
    }));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.$loki);
});

passport.deserializeUser(function(id, cb) {
  //db.users.findById(id, function (err, user) {
    var user = users.findOne({$loki:id});
    if (!user) { return cb(1); }
    cb(null, user);
  //});
});





// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());
app.use('/public', express.static('public'));

// Define routes.
app.get('/',
  function(req, res) {
    //var msg = "";
    //if (req.authInfo) msg = req.authInfo.message;
    res.render('home', { user: req.user, message: "", room_message: "" });
  });

app.get('/login', 
  function(req, res) {
   // res.logout();
    res.redirect('/');
  });
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (!user || err) {
      // *** Display message without using flash option
      // re-render the login form with a message
      return res.render('home', { user: user, message: info.message, room_message: "" })
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});
    
app.post('/register', 
  function(req, res) {
	 var myCharacter = new character.createEmpty();
	 myCharacter.owner = req.body.username;
     var newuser = users.insert({username:req.body.username, password:req.body.password, emails:[],characters:[myCharacter]});
     //if (newuser) alert('registered successfully. please log in');
     res.redirect('/');
  });
  
app.post('/character-update', 
  function(req, res) {
     var owner = users.findOne({username: req.body.owner});
	var character = owner.characters[0];
	character.name = req.body.name;
	character.race = req.body.race;
	character.class = req.body.class;
	character.level = req.body.level;
     //if (newuser) alert('registered successfully. please log in');
     res.redirect('/profile');
  });
  
app.post('/join', 
  function(req, res) {
	  var pathname = req.body.path;
     var room = rooms.findOne({gametitle:req.body.gametitle});
	 if (!room){
		 var room_message = "invalid room"
		 if (pathname=='/rooms')res.render('rooms', { user: req.user, room_message: room_message, rooms: rooms.chain().simplesort('gametitle').data() });
		 else res.render('home', { user: req.user, message: "", room_message: room_message });
	 }
     else if(room.secret != req.body.secret){
		 var room_message = "invalid secret"
		 if (pathname=='/rooms')res.render('rooms', { user: req.user, room_message: room_message, rooms: rooms.chain().simplesort('gametitle').data() });
		 else res.render('home', { user: req.user, message: "", room_message: room_message });
	 }else {
		 //if the player is not the owner or in the room list, the are added
		 var playerName = req.user.username;
		 if ((room.owner != playerName) && (searchRoomPlayers(room, playerName) == false)){
			 room.players.push(playerName);
			 rooms.update(room);
		 }
         res.redirect('/rooms/' + req.body.gametitle); 
     }
     //if (newuser) alert('registered successfully. please log in');
     res.redirect('/');
  });

app.post('/create', 
  function(req, res) {
     var newroom = rooms.insert({gametitle:req.body.gametitle, secret:req.body.secret, owner: req.user.username, players:[], playerLimit: 6, messages: []});
     //if (newuser) alert('registered successfully. please log in');
     res.redirect('/rooms/'+req.body.gametitle);
  });
  
app.get('/rooms',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
	  var therooms = rooms.chain().simplesort('gametitle').data();
	  var theUser = req.user.username;
	  var roomsOwned = [];
	  var roomsJoined = [];
	  for (var i = 0; i < therooms.length; i++){
		  if (therooms[i].owner == theUser) roomsOwned.push(therooms[i]);
		  if (searchRoomPlayers(therooms[i], theUser) == true) roomsJoined.push(therooms[i]);
	  }
      res.render('rooms', { user: req.user, room_message: "", roomsOwned: roomsOwned, roomsJoined: roomsJoined });
  });
app.get('/rooms/:room', require('connect-ensure-login').ensureLoggedIn(), function(req, res){
	
    var theroom = rooms.findOne({gametitle: req.params.room});
    var playerName = req.user.username;

    if (!theroom) res.render('404', { title: req.params.room, message: 'This room does not exist.' });
	else {
   
      var messages = theroom.messages;
      //let sortedmessages = messages.chain().simplesort('time').data();
      
      //res.render('gameroom', { user: req.user, roomID: req.params.room });
      renderRoom(req, res, messages, theroom);
   }

});

app.post('/enterroom', 
  function(req, res) {
	  var pathname = req.body.path;
	  var roomname = pathname.split('/')[2];
	  var playerName = req.user.username;
	  var theroom = rooms.findOne({gametitle: roomname});
	  console.log(playerName);
	  console.log(roomname);
	  console.log(theroom.secret);
	  console.log(req.body.secret);
      if (theroom.secret == req.body.secret){
		theroom.players.push(playerName);
		rooms.update(theroom);
	  }
      res.redirect('/rooms/' + roomname); 
	  
  });
function renderRoom(req, res, sortedmessages, theroom) {
	var isMember = false;
	var playerName = req.user.username;
	if ((theroom.owner == playerName) || (searchRoomPlayers(theroom, playerName) == true)) isMember = true;
    res.render('gameroom', {
        room: theroom,
        user: req.user,
        messages: sortedmessages,
		isMember: isMember,
    });
}
//received chat message from a game room
//get the game room id from the message
//search for that room object in the database
//append message to room message array and update db
app.post('/chat', function (req, res){
   var posted = req.body;
   var roomid = posted.room - 1000;
   console.log(roomid);
   var room = rooms.findOne({$loki: roomid});
   room.messages.push(posted);
   rooms.update(room);
   //var coll = req.database.getCollection('messages');
   console.log(room.messages);
   //var message = messages.insert((posted));
   //console.log(message);
});
 // route for facebook authentication and login
app.get('/auth/facebook', passport.authenticate('facebook', { scope : 'email' }));

    // handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect : '/',
            failureRedirect : '/'
        }));
		
app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('profile', { user: req.user });
  });
  
app.get('/contact',
  function(req, res){
    res.render('contact', { user: req.user });
  });
  
app.use((req, res, next) => {
        res.status(404);
        res.render('404', { title: '404', message: 'This page does not exist.' });
    });
    

server.listen(8181, () => console.log('Listening on http://localhost:8181'));

//some utility
function searchRoomPlayers(room, playerName){
	var numberOfPlayers = room.players.length;
	for (var i = 0; i < numberOfPlayers; i++){
		if (room.players[i] == playerName) return true;
	}
	return false;
}

function freshUser(name){
	this.username = name;
	this.password = ""; 
	var myCharacter = new character.createEmpty();
	myCharacter.owner = name;
	this.characters = [myCharacter];
	this.emails = [];
}


