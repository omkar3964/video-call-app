import React, { useEffect, useRef, useState } from "react";
import { TextField, Badge } from '@mui/material';
import Button from '@mui/material/Button';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import FullscreenExitSharpIcon from '@mui/icons-material/FullscreenExitSharp'
import FullscreenSharpIcon from '@mui/icons-material/FullscreenSharp'
import ChatIcon from '@mui/icons-material/Chat'
import io from "socket.io-client";
import styles from "../styles/videoComponent.module.css"
import { IconButton } from "@mui/material";
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

const server_url = "http://localhost:8000"

var connections = {}
const peerConfigConnections = {
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" }
  ]
}


export default function VideoMeetComponent() {
  const videoRef = useRef([])

  var socketRef = useRef()

  let socketIdRef = useRef()

  let localVideoRef = useRef()

  let [videoAvailable, setVideoAvailable] = useState(true)

  let [audioAvailable, setAudioAvailable] = useState(true)

  let [video, setVideo] = useState([])

  let [audio, setAudio] = useState(true)

  let [screen, setScreen] = useState(false)

  let [showModal, setModal] = useState(false);

  let [screenAvailable, setScreenAvailable] = useState();

  let [messages, setMessages] = useState([])

  let [message, setMessage] = useState("hi..");

  let [newMessages, setNewMessages] = useState(0);

  let [askForUsername, setAskForUsername] = useState(true);

  let [username, setUsername] = useState("");


  let [videos, setVideos] = useState([])

  const messagesEndRef = useRef(null);

  const [controlsVisible, setControlsVisible] = useState(true);

  let inactivityTimeout = useRef(null);



  // for expand and compress screen
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpand = (socketId) => {
    setExpandedId(prev => (prev === socketId ? null : socketId));
  };


  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoPermission) {
        setVideoAvailable(true)
      } else {
        setVideoAvailable(false)
      }


      const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (audioPermission) {
        setAudioAvailable(true)
      } else {
        setAudioAvailable(false)
      }


      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true)
      } else {
        setScreenAvailable(false)
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable })
        if (userMediaStream) {
          window.localStream = userMediaStream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream
          }
        }

      }

    } catch (error) {
      console.log(error)

    }
  }

  const getUserMediaSuccess = (stream) => {

    try {
      window.localStream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.log(error)
    }
    window.localStream = stream
    localVideoRef.current.srcObject = stream

    for (let id in connections) {
      if (id === socketIdRef.current) continue

      connections[id].addStream(window.localStream)

      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description)
          .then(() => {
            socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription }))
          })
          .catch(e => console.log(e))
      })
    }

    stream.getTracks().forEach(track => track.onended = () => {
      setVideo(false)
      setAudio(false)

      try {
        let tracks = localVideoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())

      } catch (e) {
        console.log(e)
      }

      let blackSilence = (...args) => new MediaStream([black(...args), silance()])
      window.localStream = blackSilence()
      localVideoRef.current.srcObject = window.localStream

      for (let id in connections) {
        connections[id].addStream(window.localStream)
        connections[id].createOffer().then((description) => {
          connections[id].setLocalDescription(description)
            .then(() => {
              socketRef.current.emit("signal", id, JSON.stringify({ "sdp": connections[id].localDescription }))
            }).catch(e => console.log(e))
        })
      }
    })
  }
  let silance = () => {
    let ctx = new AudioContext()
    let oscillator = ctx.createOscillator()

    let dst = oscillator.connect(ctx.createMediaStreamDestination())

    oscillator.start()
    ctx.resume()
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
  }
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), { width, height })

    canvas.getContext('2d').fillRect(0, 0, width, height)
    let stream = canvas.captureStream()
    return Object.assign(stream.getVideoTracks()[0], { enabled: false })
  }

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .then((stream) => { })
        .catch((e) => console.log(e))
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      } catch (e) { console.log(e) }
    }
  }


  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message)

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId].createAnswer().then((description) => {
              connections[fromId].setLocalDescription(description).then(() => {
                socketRef.current.emit("signal", fromId, JSON.stringify({ "sdp": connections[fromId].localDescription }))
              }).catch(e => console.log(e))
            }).catch(e => console.log(e))
          }
        }).catch(e => console.log(e))
      }
      if (signal.ice) {
        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
      }
    }
  }

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data }
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }


  };

  let connectToSocketServer = () => {

    socketRef.current = io(server_url, { transports: ['websocket'], reconnection: false });

    socketRef.current.on('signal', gotMessageFromServer);

    socketRef.current.on('connect', () => {
      console.log("on true", socketRef.current);
      socketRef.current.emit("join-call", window.location.href)


      socketIdRef.current = socketRef.current.id
      socketRef.current.on("chat-message", addMessage)

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id))
      })

      socketRef.current.on("user-joined", (id, clients) => {
        console.log(id, clients)
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(peerConfigConnections)

          connections[socketListId].onicecandidate = function (event) {
            console.log("new", id)
            if (event.candidate != null) {
              socketRef.current.emit("signal", socketListId, JSON.stringify({ 'ice': event.candidate }))
            }
          }
          connections[socketListId].onaddstream = (event) => {
            let videoExists = videoRef.current.find(video => video.socketId === socketListId)
            console.log("before", videos, videoExists)

            if (videoExists) {
              setVideos(videos => {
                const updatedVideos = videos.map(video =>
                  video.socketId === socketListId ? { ...video, stream: event.stream } : video)
                videoRef.current = updatedVideos
                return updatedVideos
              })
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoPlay: true,
                playsinline: true
              }

              setVideos(videos => {
                const updatedVideos = [...videos, newVideo]
                videoRef.current = updatedVideos
                return updatedVideos
              })

            }
          }
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream)
          }
          else {
            let blackSilence = (...args) => new MediaStream([black(...args), silance()])
            window.localStream = blackSilence()
            connections[socketListId].addStream(window.localStream)

          }
          if (socketIdRef.current === id) {
            connections[socketListId].createOffer()
              .then(offer => connections[socketListId].setLocalDescription(offer))
              .then(() => {
                socketRef.current.emit('signal', socketListId, JSON.stringify({ 'sdp': connections[socketListId].localDescription }));
              })
              .catch(e => console.error("Offer error", e));
          }
        })


      })


    })
  }

  let getMedia = () => {
    setVideo(videoAvailable)
    setAudio(audioAvailable)
    connectToSocketServer()
  }
  let connect = async () => {
    setAskForUsername(false);

    await getPermissions(); 
    getMedia()
  };
  let handelVideo = () => {
    if (window.localStream) {
      window.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled; // toggle the actual video track
      });
      setVideo(window.localStream.getVideoTracks()[0].enabled); // update UI state
    }
  }
  let handelAudio = () => {
    if (window.localStream) {
      window.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled; // toggle the actual audio track
      });
      setAudio(window.localStream.getAudioTracks()[0].enabled); // update UI state
    }
  }


  let getDislayMediaSuccess = (stream) => {
    console.log("HERE")
    try {
      window.localStream.getTracks().forEach(track => track.stop())
    } catch (e) { console.log(e) }

    window.localStream = stream
    localVideoRef.current.srcObject = stream

    for (let id in connections) {
      if (id === socketIdRef.current) continue

      connections[id].addStream(window.localStream)

      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description)
          .then(() => {
            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
          })
          .catch(e => console.log(e))
      })
    }

    stream.getTracks().forEach(track => track.onended = () => {
      setScreen(false)

      try {
        let tracks = localVideoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
      } catch (e) { console.log(e) }

      let blackSilence = (...args) => new MediaStream([black(...args), silance()])
      window.localStream = blackSilence()
      localVideoRef.current.srcObject = window.localStream

      getUserMedia()

    })
  }



  let getDisplayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          .then(getDislayMediaSuccess)
          .then((stream) => { })
          .catch((e) => console.log(e))
      }
    }
  }

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia()
    }
  }, [screen])
  let handleScreen = () => {
    setScreen(!screen)
  }
  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username)
    setMessage("")
  }
  let handleEndCall = () => {
    try {
      let tracks = localVideoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    } catch (e) { }
    window.location.href = "/history"
  }
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showModal])

  let handleModal = () => {
    setModal(!showModal)
    setNewMessages(0)
  }

  // for display button container when move 


  useEffect(() => {
    getPermissions()
    const showControls = () => {
      setControlsVisible(true);
      clearTimeout(inactivityTimeout.current);
      inactivityTimeout.current = setTimeout(() => setControlsVisible(false), 3000); // hide after 3s
    };

    // Events to trigger visibility
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown'];
    events.forEach(event => window.addEventListener(event, showControls));

    return () => {
      events.forEach(event => window.removeEventListener(event, showControls));
      clearTimeout(inactivityTimeout.current);
    };
  }, []);


  // from chatgpt
  useEffect(() => {
    videos.forEach(video => {
      const el = videoRef.current[video.socketId];
      if (el && el.srcObject !== video.stream) {
        el.srcObject = video.stream;
      }
    });
  }, [videos]);



  return (
    <div className={styles.videomeet}>

      {askForUsername === true
        ? <div className={styles.userInput} >

          <div className={styles.userInputvideo}>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
          <div className={styles.userNameInput}>
            <TextField id="outlined-basic" label="username" value={username} onChange={(e) => setUsername(e.target.value)} variant="outlined" />
            <Button variant="contained" onClick={connect}>Connect</Button>
          </div>

        </div>
        : <div className={styles.meetVideoContainer} >
          {
            showModal ?
              <div className={styles.chatRoom}>
                <div className={styles.chatContainer}>
                  <div className={styles.chatHeader}>
                    <p>Participants <b>{videos.length}</b></p>
                    <p onClick={handleModal} style={{ cursor: "pointer" }}>✖</p>
                  </div>


                  <hr />
                  <div className={styles.chattingDisplay} >
                    {messages.length > 0 ?
                      messages.map((item, index) => {
                        return (
                          <div key={index} className={item.sender === username ? styles.mainChat : styles.userChat} >
                            <h6> <i>{item.sender}</i></h6>
                            <p>{item.data}</p>
                          </div>
                        )
                      }) :
                      <><i>No Messages yet</i></>
                    }
                    <div ref={messagesEndRef} />
                  </div>
                  <div className={styles.chattingArea}>
                    <hr />
                    <TextField id="standard-basic" value={message} onChange={(e) => setMessage(e.target.value)} label="Type msg here.." variant="standard" InputProps={{ disableUnderline: true }} sx={{ flex: 1 }} />
                    <div role="button" onClick={sendMessage}  > <SendOutlinedIcon color="primary" /></div>
                  </div>

                </div>
              </div>
              : <></>

          }


          <div className={styles.buttonContainers} style={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.5s ease' }} >
            <IconButton onClick={handelVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handelAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            {screenAvailable === true ?
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
              </IconButton>
              : <></>
            }
            <Badge badgeContent={newMessages} max={999} color="primary">
              <IconButton onClick={handleModal} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>

            </Badge>
          </div>

          <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted></video>
          <div className={styles.conferenceView}>
            {videos.map((video) => {
              let videoClass = '';

              if (videos.length === 1) {
                videoClass = styles.singleVideo;
              } else if (videos.length === 2) {
                videoClass = styles.doubleVideo;
              } else {
                videoClass = styles.multipleVideo;
              }

              return (
                <div
                  key={video.socketId}
                  className={`${styles.videoWrapper} ${videoClass} ${expandedId === video.socketId ? styles.expanded : ''}`}
                >

                  <video
                    data-socket={video.socketId}
                    ref={el => {
                      if (el) videoRef.current[video.socketId] = el;
                    }}
                    autoPlay
                    playsInline
                  />

                  <button
                    className={styles.expandBtn}
                    onClick={() => toggleExpand(video.socketId)}
                  >
                    {expandedId === video.socketId ? <FullscreenExitSharpIcon /> : <FullscreenSharpIcon />}
                  </button>
                </div>
              );
            })}
          </div>

        </div>

      }
    </div>
  )
}