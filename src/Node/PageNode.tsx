import { useNavigate } from "react-router-dom";
import { NodeData } from "../utils/types"
import { useEffect, useRef, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import { supabase } from "../supabaseClient";
import cx from "classnames";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import styles from "./Node.module.css";
import { FileImage } from "../components/FileImage";
import { ErrorMessage } from "../Page/ErrorMessage";

type PageNodeProps = {
    node: NodeData;
    isFocused: boolean;
    index: number;
}

export const PageNode = ({ node, isFocused, index }: PageNodeProps) => {
    const navigate = useNavigate();
    const [ pageTitle , setPageTitle ] = useState("");
    const { removeNodeByIndex } = useAppState();
    const [emoji, setEmoji] = useState("📃");
    const [cover, setCover] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
    const getUser = async () => {
        const { data, error } = await supabase.auth.getUser();
        if (data?.user?.id) {
        setUserId(data.user.id);
        } else {
        console.error("User not found:", error);
        }
    };
    getUser();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            event.preventDefault();
            if (event.key === "Backspace") {
                removeNodeByIndex(index);
            }
            if (event.key === "Enter") {
                navigate(`/${node.value}`);
            }
        };
        if (isFocused) {
            window.addEventListener("keydown", handleKeyDown);
        } else {
            window.removeEventListener("keydown", handleKeyDown);
        }
        
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        }
    }, [isFocused, removeNodeByIndex, index, navigate, node]);

    useEffect(() => {
        if (!errorMessage) return;
        const timer = setTimeout(() => {
            /* c8 ignore next */
            setErrorMessage(null);
        }, 15000);

        return () => clearTimeout(timer);
    }, [errorMessage]);

    useEffect(() => {
        if (!userId) return;
        const fetchPageData = async () => {
            try {
                const { data, error } = await supabase
                    .from("pages")
                    .select("title, emoji, cover")
                    .eq("slug", node.value)
                    .eq("created_by", userId)
                    .single();

                if (error) throw error;

                if (data) {
                    setPageTitle(data.title);
                    setEmoji(data.emoji || "📃");
                    setCover(data.cover);
                }
            } catch (err: any) {
                setErrorMessage("Failed to load page data");
            }
        }
       fetchPageData();
    }, [node.type, node.value, userId]);

    const handleEmojiClick = async (emojiObject: EmojiClickData) => {
        const selectedEmoji = emojiObject.emoji;
         if (!selectedEmoji || !node.value || !userId) return;
        /* c8 ignore next 15 */
        try {
            const { error } = await supabase
                .from("pages")
                .update({ emoji: selectedEmoji })
                .eq("slug", node.value)
                .eq("created_by", userId);

            if (error) throw error;

            setEmoji(selectedEmoji);
            setShowPicker(false);
        } catch (err: any) {
            setErrorMessage("Failed to update emoji");
        }
    };

    const handlePageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/${node.value}`);
    };

    const handleEmojiIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPicker((prev) => !prev);
    };

    const handleDeleteClick = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!node.value || !userId) return;

            try {
                const { error } = await supabase
                    .from("pages")
                    .delete()
                    .eq("slug", node.value)
                    .eq("created_by", userId);

                if (error) throw error;

                removeNodeByIndex(index);
            } catch (err: any) {
                /* c8 ignore next 2 */
                setErrorMessage("Failed to delete page");
            }
        };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className={cx(styles.node, styles.page)} style={{ width: "20rem" }}>
                {cover ? (
                    <div className={styles.pageCover} onClick={handlePageClick}>
                    <FileImage
                        filePath={cover}
                        alt="Cover image"
                        className={styles.pageCoverImg}
                    />
                    </div>
                ) : (
                    <div className={styles.pageCover} onClick={handlePageClick}>
                    <img
                        src="/noted-cover.png"
                        alt="Default cover"
                        className={styles.pageCoverImg}
                    />
                    </div>
                )}
            <div className={styles.pageContent} onClick={handlePageClick}>
                <span onClick={handleEmojiIconClick} className={styles.emoji} data-testid="emoji">
                    {emoji}
                </span>
                {showPicker && (
                    <div className={styles.emojiPicker} ref={pickerRef} onClick={(e) => e.stopPropagation()} data-testid="emoji-picker">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                )}
                <span className={styles.pageTitle} data-testid="textbox">{pageTitle}</span>
                <button className={styles.deleteButton} onClick={handleDeleteClick} title="Delete this page">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9zm2 2h2v1h-2V5zM7 8h2v10H7V8zm4 0h2v10h-2V8zm4 0h2v10h-2V8z" />
                    </svg>
                </button>
                {errorMessage && (
                    <ErrorMessage 
                        message={errorMessage} 
                        onClose={() => setErrorMessage(null)} 
                    />
                )}
            </div>
        </div>
    )
}