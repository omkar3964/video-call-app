import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth.jsx'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import "../App.css"
import { AuthContext } from '../contexts/AuthContexts.jsx';

function HomeComponent() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("")

  const { addToUserHistory } = useContext(AuthContext)

  let handleJoinVideoCall = async () => {
    await addToUserHistory(meetingCode)
    navigate(`/${meetingCode}`)
  }
  return (
    <>
      <div className="navBar">
        <div style={{ display: "flex", alignItems: "center" }}>

          <h2>Apna Video Call</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={() => { navigate("/history") }}>
            <RestoreIcon />
            <p>History</p>
          </IconButton>

          <Button onClick={() => { localStorage.removeItem("token"); navigate("/auth") }}>
            <p>Logout</p>
          </Button>
        </div>

      </div>


      <div className="meetContainer">
        <div className="leftPanel">
          <h2>Providing Quality Video Call Just Like Quality Education</h2>

          <TextField  onChange={e => setMeetingCode(e.target.value)}   id="outlined-basic"    label="Meeting Code"   variant="outlined"     fullWidth      className="meetingInput"    />
          <Button onClick={handleJoinVideoCall} variant="contained"    className="joinButton"       >            Join          </Button>
        </div>


        <div className='rightPanel'>
          <img srcSet='/logo3.png' alt="" />
        </div>
      </div>
    </>
  )
}

export default withAuth(HomeComponent)