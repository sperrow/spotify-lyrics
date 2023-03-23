import React, { useState, useRef, useEffect, useCallback } from 'react';
import defaultTrack from './data/defaultTrack';
import './Track.css';

function Track(props) {
    const currentTrack = useRef(defaultTrack);
    const currentLyrics = useRef([]);
    const lyricsSynced = useRef(false);

    const [current_track, setTrack] = useState(currentTrack.current);
    const [current_lyrics, setLyrics] = useState(currentLyrics.current);
    const [current_lyricLineId, setLyricLineId] = useState(undefined);
    const [is_playing, setIsPlaying] = useState(false);

    const getCurrentlyPlaying = useCallback(async () => {
        let response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            method: 'GET',
            headers: { Authorization: `Bearer ${props.token}` },
        });
        if (!response.ok) {
            console.error(response.error);
            if (response.status === 401 || response.error.status === 401) {
                props.refreshToken();
            }
        } else if (response.status !== 204) {
            response = await response.json();
        }
        return response;
    }, [props]);

    const getLyrics = useCallback(async (isNewSong, track, currentMs) => {
        if (isNewSong) {
            let response = await fetch('https://spotify-lyric-api.herokuapp.com/?trackid=' + track.id);
            response = await response.json();
            if (!response.error && response.lines) {
                currentLyrics.current = response.lines;
                setLyrics(currentLyrics.current);
                lyricsSynced.current = response.syncType === 'LINE_SYNCED';
            }
        }
        findLine(currentMs);
    }, []);

    function findLine(currentMs) {
        if (!lyricsSynced.current) {
            setLyricLineId(undefined);
        } else {
            let currentLyricLine = currentLyrics.current[0];
            for (let i = 0; i < currentLyrics.current.length; i++) {
                const line = currentLyrics.current[i];
                const lineMs = parseInt(line.startTimeMs, 10);
                if (currentMs < lineMs - 500) {
                    // buffer
                    if (i === 0) {
                        currentLyricLine = {};
                    }
                    break;
                }
                currentLyricLine = line;
            }
            setLyricLineId(currentLyricLine.startTimeMs);
        }
    }

    useEffect(() => {
        let run = true;

        const fetchData = async () => {
            if (run) {
                try {
                    const res = await getCurrentlyPlaying();
                    setIsPlaying(!!res.is_playing);
                    if (res.item) {
                        const updatedTrack = res.item;
                        const isNewSong = currentTrack.current.id !== updatedTrack.id;
                        currentTrack.current = updatedTrack;
                        setTrack(updatedTrack);
                        getLyrics(isNewSong, updatedTrack, res.progress_ms);
                    }
                } catch (error) {
                    console.log('error:', error);
                    run = false;
                    setIsPlaying(false);
                    clearInterval(interval);
                }
            }
        };

        const interval = setInterval(() => {
            fetchData();
        }, 1000);

        fetchData();

        return () => {
            clearInterval(interval);
        };
    }, [getCurrentlyPlaying, getLyrics, props.token]);

    const nowPlaying = is_playing ? 'Now Playing' : 'Not Playing';
    const albumCover =
        current_track &&
        current_track.album &&
        current_track.album.images &&
        current_track.album.images[0] &&
        current_track.album.images[0].url ? (
            <img src={current_track.album.images[0].url} className="now-playing__cover" alt="album cover" />
        ) : null;

    return (
        <>
            <div className="container">
                <div className="main-wrapper">
                    <div className="playing">{nowPlaying}</div>
                    <div className="track-container">
                        {albumCover}
                        <div className="now-playing__side">
                            <div className="now-playing__name">{current_track.name}</div>
                            <div className="now-playing__artist">{current_track.artists[0].name}</div>
                        </div>
                    </div>
                    <div className="lyrics-container">
                        <div>
                            {current_lyrics.map((line) => (
                                <div
                                    key={line.startTimeMs}
                                    className={line.startTimeMs === current_lyricLineId ? 'current-line' : ''}
                                >
                                    {line.words}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Track;
