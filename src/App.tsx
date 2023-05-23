import React, { useState, useEffect } from 'react';
import Track from './Track';
import Login from './Login';
import './App.css';

function App() {
    const [token, setToken] = useState('');

    async function getToken(refresh = false) {
        const url = '/auth/' + (refresh ? 'refresh_token' : 'token');
        const response = await fetch(url);
        const json = await response.json();
        setToken(json.access_token);
    }

    useEffect(() => {
        getToken();
    });

    return (
        <>
            { (token === '') ? <Login/> : <Track token={token} refreshToken={() => getToken(true)} /> }
        </>
    );
}

export default App;
