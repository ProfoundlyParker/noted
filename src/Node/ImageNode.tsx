import { NodeData } from "../utils/types"
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import cx from "classnames";
import styles from "./Node.module.css";
import { FileImage } from "../components/FileImage";
import { uploadImage } from "../utils/uploadImage";
import { Loader } from "../components/Loader";
import { supabase } from "../supabaseClient";
import { Resizable } from "re-resizable";
import { usePageId } from "../Page/PageIdContext";
import { ErrorMessage } from "../Page/ErrorMessage";

type ImageNodeProps = {
    node: NodeData;
    index: number;
};

export const ImageNode = ({ node, index }: ImageNodeProps) => {
    const pageId = usePageId();
    const { removeNodeByIndex, changeNodeValue, changeNodeType } = useAppState();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [imagePath, setImagePath] = useState(node.value);
    const [width, setWidth] = useState(node.width || 300);
    const [height, setHeight] = useState(node.height || 200);
    const [caption, setCaption] = useState(node.caption || "");
    const [isCaptionEditing, setIsCaptionEditing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const captionInputRef = useRef<HTMLTextAreaElement>(null);
    const [showButtons, setShowButtons] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isMobile = window.innerWidth <= 650;
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isCaptionEditing && captionInputRef.current) {
            captionInputRef.current.style.height = "auto";
            captionInputRef.current.style.height = captionInputRef.current.scrollHeight + "px";
        }
    }, [caption, isCaptionEditing]);

    useEffect(() => {
        const getUser = async () => {
            try {
                    const { data, error } = await supabase.auth.getUser();
                    if (error || !data?.user?.id) throw error || new Error("User not found");
                    setUserId(data.user.id);
                } catch (err: any) {
                    setErrorMessage("Failed to fetch user info");
                }
            };
        getUser();
    }, []);

    useEffect(() => {
        if (!errorMessage) return;
        const timer = setTimeout(() => {
            /* c8 ignore next */
            setErrorMessage(null);
        }, 15000);

        return () => clearTimeout(timer);
    }, [errorMessage]);
    
    const onImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const target = event.target;
        const file = target.files?.[0];

        if (!file) {
            changeNodeValue(index, "");
            setImagePath("");
            return;
        }
    
        try {
            setLoading(true);
            const result = await uploadImage(file);
            if (!result?.filePath) setErrorMessage("No file path returned");
            changeNodeValue(index, result.filePath);
            setImagePath(result.filePath);
            await handleSaveCaption();
        } catch (err: any) {
            setErrorMessage("Failed to upload image");
            changeNodeType(index, "text");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        setCaption("");
    }

    const handleDeleteImage = () => {
        removeNodeByIndex(index);
    };

    const handleReplaceImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleCaptionChange = (event: ChangeEvent<HTMLInputElement>) => {
        setCaption(event.target.value);
    };

    const handleSaveCaption = async () => {
        await updateNodeCaptionInPage(pageId, node.id, caption);
        setIsCaptionEditing(false);
    };

    const updateNodeSizeInPage = async (pageId: string, nodeId: string, newWidth: number, newHeight: number) => {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from("pages")
                .select("nodes")
                .eq("id", pageId)
                .eq("created_by", userId)
                .single();
            if (error || !data) throw error || new Error("Page not found");

            const nodes: NodeData[] = data.nodes;
            const updatedNodes = nodes.map((n) =>
                n.id === nodeId ? { ...n, width: newWidth, height: newHeight } : n
            );

            const { error: updateError } = await supabase
                .from("pages")
                .update({ nodes: updatedNodes })
                .eq("id", pageId)
                .eq("created_by", userId);
            if (updateError) throw updateError;
        } catch (err: any) {
            /* c8 ignore next 2 */
            setErrorMessage("Failed to update image size");
        }
    };

    const updateNodeCaptionInPage = async (pageId: string, nodeId: string, newCaption: string) => {
      if (!userId) return;
        try {
            const { data, error } = await supabase
                .from("pages")
                .select("nodes")
                .eq("id", pageId)
                .eq("created_by", userId)
                .single();
            if (error || !data) throw error || new Error("Page not found");

            const nodes: NodeData[] = data.nodes;
            const updatedNodes = nodes.map((n) => n.id === nodeId ? { ...n, caption: newCaption } : n);

            const { error: updateError } = await supabase
                .from("pages")
                .update({ nodes: updatedNodes })
                .eq("id", pageId)
                .eq("created_by", userId);
            if (updateError) throw updateError;

            return;
        } catch (err: any) {
            /* c8 ignore next 2 */
            setErrorMessage("Failed to update caption");
        }
    };

    useEffect(() => {
    if (isCaptionEditing && captionInputRef.current) {
        const el = captionInputRef.current;
        el.focus();
        // Move caret to end
        el.selectionStart = el.selectionEnd = el.value.length;
    }
    }, [isCaptionEditing]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            /* c8 ignore next 9 */
            if (document.activeElement?.tagName === "INPUT") return;
            event.preventDefault();
            if (event.key === "Backspace") {
                removeNodeByIndex(index);
            }
            if (event.key === "Enter") {
                fileInputRef.current?.click();
            }
        };
        
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [removeNodeByIndex, index])

    useEffect(() => {
        if (!isMobile) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (nodeRef.current && !nodeRef.current.contains(e.target as Node)) {
                setShowButtons(false);
            }
        };

        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [isMobile]);


    return (
        <div className={cx(styles.node, styles.image)} ref={nodeRef} data-testid="image-node">
            {imagePath ? (
                    <>
                <div className={styles.imageAndCaption}>
                 <Resizable
                    size={{ width }}
                    enable={{
                        top: false,
                        right: true,
                        bottom: false,
                        left: true,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false,
                    }}
                    maxWidth={900}
                    maxHeight={700}
                    minHeight="auto"
                    minWidth={400}
                    data-testid="resize-wrapper"
                    style={{ display: "inline-table" }}
                    onResizeStop={async (e, direction, ref, delta) => {
                        const newWidth = ref.offsetWidth;
                        const newHeight = ref.offsetHeight;
                        setWidth(newWidth);
                        setHeight(newHeight);
                        await updateNodeSizeInPage(pageId, node.id, newWidth, newHeight);
                    }}
                    >
                    <div className={styles.imageWrapper} onClick={() => {
                        if (isMobile) {
                            /* c8 ignore next 2 */
                            setShowButtons((prev) => !prev);
                        }
                    }}>
                        <FileImage
                        filePath={imagePath}
                        data-testid="node-image"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                        <div className={styles.buttonContainer} data-testid="buttons" style={{ display: isMobile ? (showButtons ? "flex" : "none") : undefined }}>
                        <button onClick={handleDeleteImage} data-testid="delete-image" className={styles.button}>Delete</button>
                        <button onClick={handleReplaceImage} data-testid="replace-image" className={styles.button}>Replace</button>
                        </div>
                    </div>
                    <div className={styles.captionContainer}>
                          {isCaptionEditing ? (
                            <textarea
                                ref={captionInputRef}
                                type="text"
                                className={styles.captionInput}
                                data-testid="caption-input"
                                value={caption}
                                onChange={handleCaptionChange}
                                onBlur={async () => {
                                    updateNodeCaptionInPage(pageId, node.id, caption);
                                    setIsCaptionEditing(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                placeholder="Add a caption..."
                                style={{ resize: "none", width: "100%" }}
                            />
                        ) : (
                            <p
                                className={styles.caption}
                                onClick={() => setIsCaptionEditing(true)}
                                tabIndex={0}
                                style={{ cursor: "pointer" }}
                                onKeyDown={e => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        setIsCaptionEditing(true);
                                    }
                                }}
                                data-testid="image-caption"
                            >
                                {caption || "Add a caption..."}
                            </p>
                        )}
                        </div>
                    </Resizable>
                        {loading && <Loader />}
                        </div>
                    </>
                ) : (
                    <button
                        className={styles.uploadButton}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                    >
                        Upload Image
                    </button>
                )}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onImageUpload}
                data-testid="node-image-upload"
                accept="image/*"
                style={{ display: "none" }}
            />
            {errorMessage && (
                <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />
            )}
        </div>
    )
}