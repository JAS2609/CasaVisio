import {Warehouse} from "lucide-react";
import Button from "./ui/Button";
import { useAuth } from "@/context/AuthProvider";
const Navbar = () => {
  const { isSignedIn, userName, signIn, signOut } = useAuth();

  const handleAuthClick = async () => {
    try {
      if (isSignedIn) {
        await signOut();
      } else {
        await signIn();
      }
    } catch (e) {
      console.error(e);
    }
  };

    return (
        <header className="navbar">
            <nav className="inner">
                <div className="left">
                    <div className="brand">
                        <Warehouse  className="logo" />

                        <span className="name">
                            CasaVisio
                        </span>
                    </div>

                    <ul className="links">
                        <a href="#">Product</a>
                        <a href="#">Pricing</a>
                        <a href="#">Community</a>
                        <a href="#">Enterprise</a>
                    </ul>
                </div>

                <div className="actions">
                    {isSignedIn ? (
                        <>
                            <span className="greeting">
                                {userName ? `Hi, ${userName}` : 'Signed in'}
                            </span>

                            <Button size="sm" onClick={handleAuthClick} className="btn">
                                Log Out
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={handleAuthClick} size="sm" variant="ghost">
                                Log In
                            </Button>

                            <a href="#upload" className="cta">Get Started</a>
                        </>
                    )}
                </div>
            </nav>
        </header>
    )
}

export default Navbar