const express = require('express');
const dotenv = require('dotenv');
const request = require('request');
const path = require('path');

const port = 5001;

dotenv.config();

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
let access_token = '';
let refresh_token = '';

const generateRandomString = function (length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const app = express();

// app.use(express.static(path.join(__dirname, '../build')));

app.get('/auth/login', (req, res) => {
    const scope = 'user-read-currently-playing';
    const state = generateRandomString(16);
    const auth_query_parameters = new URLSearchParams({
        response_type: 'code',
        client_id: spotify_client_id,
        scope,
        redirect_uri: 'http://localhost:3000/auth/callback',
        state,
    });
    res.redirect('https://accounts.spotify.com/authorize/?' + auth_query_parameters.toString());
});

app.get('/auth/callback', (req, res) => {
    const code = req.query.code;
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code,
            redirect_uri: 'http://localhost:3000/auth/callback',
            grant_type: 'authorization_code',
        },
        headers: {
            Authorization: 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        json: true,
    };

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            access_token = body.access_token;
            refresh_token = body.refresh_token;
            res.redirect('/');
        }
    });
});

app.get('/auth/token', (req, res) => {
    res.json({
        access_token: access_token,
    });
});

app.get('/auth/refresh_token', (req, res) => {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            grant_type: 'refresh_token',
            refresh_token,
        },
        headers: {
            Authorization: 'Basic ' + Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'),
        },
        json: true,
    };

    request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            access_token = body.access_token;
            res.json({
                access_token: access_token,
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
