import { FormEvent, useState } from "react"
import { useAuthSession } from "./AuthSessionContext";
import { Navigate } from "react-router-dom";
import styles from "../utils.module.css";
import { supabase } from "../supabaseClient";
import '@fortawesome/fontawesome-free/css/all.min.css';


type SignInErrorProps = {
    message: string;
}

export const Auth = () => {
    const [ loading, setLoading ] = useState(false);
    const [ email, setEmail ] = useState("");
    const { session } = useAuthSession();
    const [ error, setError ] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        try {
            setLoading(true);
            setSuccess(false);
            const { error } = await supabase.auth.signInWithOtp({ email });

            if (error) {
                throw new Error(error.message);
            }
            setSuccess(true);
             setTimeout(() => {
                setSuccess(false);
                setEmail("");
            }, 4000);
        } catch (error) {
            if (typeof error === 'string') {
                setError(error);
            } else {
                const signInError = error as SignInErrorProps;
                setError(signInError.message || "An unknown error occurred"); // Set error message in state
            }
        } finally {
            setLoading(false);
        }
    }

    if (session) {
        return <Navigate to="/" />
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.label}>
            <form
                onSubmit={handleLogin}
                className={`${styles.login} ${loading ? styles.loading : ""} ${success ? styles.ok : ""}`}
            >
                <h1 className={styles.title} style={{'textDecoration': 'underline'}}>Noted</h1>
                <p className={styles.p}>Enter your email address below and you'll be sent a login link</p>
                <div className={styles.inputGroup}>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        placeholder="Your email"
                        className={styles.input}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                    <i className="fa fa-user" aria-hidden="true"></i>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button className={styles.button} type="submit" disabled={loading}>
                    <span className={styles.spinner}></span>
                    <span className={styles.state}>
                        {loading ? "Sending..." : success ? "Check your email!" : "Send login link"}
                    </span>
                </button>
            </form>
            </div>
        </div>
    );
}