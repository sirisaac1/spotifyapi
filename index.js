/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-flow
 */
//require dependencies
var express = require('express');//middleware, server
var request = require('request');//
var crypto = require('crypto');//for randomString generation, ties in with login
var cors = require('cors');//cross-origin resource sharing
var querystring = require('querystring');//parsing and formatting URL query strings, which is everything after the questionmark. & is a separator.
var cookieParser = require('cookie-parser');//for remembering information

var client_id = 'ffd656d913a34250893249be0fb51e92'; // your clientId
var client_secret = 'bfde7a72aac746b098582a7f651bcdc4'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

const generateRandomString = (length) => {
  return crypto
  .randomBytes(60)
  .toString('hex')
  .slice(0, length);
}

var stateKey = 'spotify_auth_state';//for cookie

var app = express();//instantiate express
//make express instance use /public directory to serve static files, in this case index.html
app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());
//when client sends get to url/login
app.get('/login', function(req, res) {

  var state = generateRandomString(16);//generate unique state for cookie
  res.cookie(stateKey, state);//remember auth state and 16 length string

  // your application requests authorization
  var scope = 'user-read-private user-read-email';//specifies what authorization is for. more in API documentation
  //get redirected to authorization login page
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({//turns object into properly formatted query string to add to URL.
      response_type: 'code',//retrieve auth code after authorization
      client_id: client_id,
      scope: scope,//scope of authorization
      redirect_uri: redirect_uri,//where it sends you back to
      state: state
    }));
});
//when client sends get to url/callback
app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});
//when client sends get to /refresh_token
app.get('/refresh_token', function(req, res) {

  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) 
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token,
          refresh_token = body.refresh_token;
      res.send({
        'access_token': access_token,
        'refresh_token': refresh_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);