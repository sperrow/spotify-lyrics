import React, { useState, useRef, useEffect, useCallback } from 'react';
import defaultTrack from './data/defaultTrack';
import './Track.css';

interface TrackProps {
    token: string;
    refreshToken: () => void;
}

interface Line {
    startTimeMs: string;
    words: string;
}

const defaultLine: Line = {
    startTimeMs: '',
    words: '',
};

function Track(props: TrackProps) {
    const currentTrack = useRef({ ...defaultTrack });
    const currentLyrics = useRef([]);
    const isPlaying = useRef(false);
    const lyricsSynced = useRef(false);
    const currentTime = useRef(0);
    const isNewSong = useRef(false);
    const timeFetched = useRef(false);

    const [current_track, setTrack] = useState(currentTrack.current);
    const [current_lyrics, setLyrics] = useState(currentLyrics.current);
    const [current_lyricLineId, setLyricLineId] = useState('');
    const [is_playing, setIsPlaying] = useState(false);

    const getCurrentlyPlaying = useCallback(async () => {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                method: 'GET',
                headers: { Authorization: `Bearer ${props.token}` },
            });
            if (response.status === 204) {
                return {};
            }
            const result = await response.json();
            if (!response.ok) {
                console.error(result.error);
                if (result.status === 401 || result.error?.status === 401) {
                    props.refreshToken();
                }
            }
            return result;
        } catch (error) {
            console.error('error:', error);
        }
    }, [props]);

    const getLyrics = useCallback(async () => {
        if (isNewSong.current) {
            const response = await fetch('https://spotify-lyric-api.herokuapp.com/?trackid=' + currentTrack.current.id);
            const result = await response.json();
            if (!result.error && result.lines) {
                currentLyrics.current = result.lines;
                setLyrics(currentLyrics.current);
                lyricsSynced.current = result.syncType === 'LINE_SYNCED';
            }
        }
        isNewSong.current = false;
        findLine();
    }, []);

    function findLine() {
        if (!lyricsSynced.current) {
            setLyricLineId('');
        } else {
            let currentLyricLine: Line = currentLyrics.current[0];
            for (let i = 0; i < currentLyrics.current.length; i++) {
                const line: Line = currentLyrics.current[i];
                const lineMs = parseInt(line.startTimeMs, 10);
                const buffer = 500; // display next line early
                if (currentTime.current < lineMs - buffer) {
                    if (i === 0) {
                        currentLyricLine = { ...defaultLine };
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
                    isPlaying.current = !!res.is_playing;
                    if (res.item) {
                        const updatedTrack = res.item;
                        isNewSong.current = currentTrack.current.id !== updatedTrack.id;
                        currentTrack.current = updatedTrack;
                        currentTime.current = res.progress_ms;
                        timeFetched.current = true;
                        setTrack(updatedTrack);
                    }
                } catch (error) {
                    run = false;
                    setIsPlaying(false);
                    isPlaying.current = false;
                    clearInterval(fetchInterval);
                    clearInterval(timeInterval);
                }
            }
        };

        const fetchInterval = setInterval(() => {
            fetchData();
        }, 1000);

        const ms = 100;
        const timeInterval = setInterval(() => {
            getLyrics();
            if (timeFetched.current) {
                timeFetched.current = false;
            } else if (isPlaying.current) {
                currentTime.current += ms;
            }
        }, ms);

        fetchData();

        return () => {
            clearInterval(fetchInterval);
            clearInterval(timeInterval);
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
                            {current_lyrics.map((line: Line) => (
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
