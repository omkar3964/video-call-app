import { Link, useNavigate } from 'react-router-dom'


function Landing() {
    const navigate = useNavigate()
    return (
        <div className='landingPageContainer'>
            <nav className='navbar'>
                <div className="navHeader">
                    <h2>Video Call</h2>
                </div>

                {/* Desktop Navigation */}
                <div className="navList">
                    <p onClick={() => navigate("/123")}>Join as Guest</p>
                    <p onClick={() => navigate("/auth")}>Register</p>
                    <div role="button" onClick={() => navigate("/auth")}>
                        <p>Login</p>
                    </div>
                </div>

                {/* Mobile Hamburger */}
                <div className="hamburgerMenu">
                    <span>&#9776;</span>
                    <div className="dropdown">
                        <p onClick={() => navigate("/123")}>Join as Guest</p>
                        <hr />
                        <p onClick={() => navigate("/auth")}>Register</p>
                        <hr />
                        <p onClick={() => navigate("/auth")}>Login</p>
                    </div>
                </div>
            </nav>


            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with our  loved Ones</h1>
                    <p>Covered distance by Video Call</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div className='mobile'>
                    <img src="mobile.png" alt="Mobile" />

                </div>
            </div>

        </div>
    )
}

export default Landing