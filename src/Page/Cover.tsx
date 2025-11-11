import { FileImage } from "../components/FileImage";
import { supabase } from "../supabaseClient";
import { uploadImage } from "../utils/uploadImage";
import styles from "./Cover.module.css";
import { ErrorMessage } from "./ErrorMessage";
import { ChangeEventHandler, useEffect, useRef, useState } from "react";

type CoverProps = {
    filePath?: string;
    changePageCover: (filePath: string) =>  void;
    pageId?: number;
}

export const Cover = ({ filePath, changePageCover, pageId }: CoverProps) => {
    const [offsetY, setOffsetY] = useState(0);
	const [tempOffsetY, setTempOffsetY] = useState(0);
	const [isRepositioning, setIsRepositioning] = useState(false);
    const [dragging, setDragging] = useState(false);
    const startYRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [imageHeight, setImageHeight] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const [showButtons, setShowButtons] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isMobile = window.innerWidth <= 650;

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

    /* c8 ignore next 84 */
    const onMouseDown = (e: React.MouseEvent) => {
		if (!isRepositioning) return;
        e.preventDefault();
        setDragging(true);
		startYRef.current = e.clientY;
	};

    const onMouseMove = (e: MouseEvent) => {
        if (!dragging || startYRef.current === null) return;

        const deltaY = e.clientY - startYRef.current;
        startYRef.current = e.clientY;

       setTempOffsetY((prev) => {
            const tentative = prev + deltaY;

            const minOffset = Math.min(0, containerHeight - imageHeight);
            const maxOffset = 0; 

            return Math.max(minOffset, Math.min(tentative, maxOffset));
        });

    };

	const onMouseUp = () => {
        if (imageHeight > containerHeight) {
            const minOffset = containerHeight - imageHeight;
            const maxOffset = 0;
    
            if (tempOffsetY > maxOffset) {
                setTempOffsetY(maxOffset);
            } else if (tempOffsetY < minOffset) {
                setTempOffsetY(minOffset);
            }
        } else {
            setTempOffsetY(0);
        }
		setDragging(false);
		startYRef.current = null;
        document.body.style.userSelect = "auto";
	};

    // Start dragging on touch
    const onTouchStart = (e: React.TouchEvent) => {
        if (!isRepositioning) return;
        setDragging(true);
        startYRef.current = e.touches[0].clientY;
    };

    // Handle dragging on touch
    const onTouchMove = (e: TouchEvent) => {
        if (!dragging || startYRef.current === null) return;

        const deltaY = e.touches[0].clientY - startYRef.current;
        startYRef.current = e.touches[0].clientY;

        setTempOffsetY((prev) => {
            const tentative = prev + deltaY;

            const minOffset = Math.min(0, containerHeight - imageHeight);
            const maxOffset = 0;

            return Math.max(minOffset, Math.min(tentative, maxOffset));
        });
    };

    // End dragging on touch
    const onTouchEnd = () => {
        if (imageHeight > containerHeight) {
            const minOffset = containerHeight - imageHeight;
            const maxOffset = 0;

            if (tempOffsetY > maxOffset) {
                setTempOffsetY(maxOffset);
            } else if (tempOffsetY < minOffset) {
                setTempOffsetY(minOffset);
            }
        } else {
            setTempOffsetY(0);
        }

        setDragging(false);
        startYRef.current = null;
    };

    useEffect(() => {
        if (dragging) {
            /* c8 ignore next 5 */
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("touchmove", onTouchMove);
            window.addEventListener("touchend", onTouchEnd);
            document.body.style.userSelect = "none"; // Disable text selection while dragging
        } else {
            document.body.style.userSelect = "auto"; // Re-enable text selection
        }
    
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
            document.body.style.userSelect = "auto";
        };
    }, [dragging]);    

    useEffect(() => {
        if (!pageId || !userId) return;
        const loadOffset = async () => {
            try {
                const { data, error } = await supabase
                    .from("pages")
                    .select("cover_offset_y")
                    .eq("id", pageId)
                    .eq("created_by", userId)
                    .single();

                if (error) {
                    setErrorMessage("Failed to load cover position");
                    return;
                }

                if (data) {
                    setOffsetY(data.cover_offset_y ?? 0);
                }
            } catch (err: any) {
                setErrorMessage("Unexpected error loading cover position");
            }
        };
    
        loadOffset();
    }, [pageId, userId]);    

    useEffect(() => {
        const handleResize = () => {
            if (imageRef.current && containerRef.current) {
                const imgHeight = imageRef.current.offsetHeight;
                const contHeight = containerRef.current.offsetHeight;
                setImageHeight(imgHeight);
                setContainerHeight(contHeight);

                setTempOffsetY((offsetY / 100) * imgHeight);
            }
        };

        if (imageHeight) {
            setTempOffsetY((offsetY / 100) * imageHeight);
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [offsetY, imageHeight]);

    useEffect(() => {
        if (!errorMessage) return;
        const timer = setTimeout(() => {
            /* c8 ignore next */
            setErrorMessage(null);
        }, 15000);

        return () => clearTimeout(timer);
    }, [errorMessage]);


    const onImageLoad = () => {
        if (imageRef.current && containerRef.current) {
            const imgHeight = imageRef.current.offsetHeight;
            const contHeight = containerRef.current.offsetHeight;
            setImageHeight(imgHeight);
            setContainerHeight(contHeight);
            setTempOffsetY((offsetY / 100) * imgHeight);
        }
    };    

	const imageStyle: React.CSSProperties = {
		transform: `translateY(${isRepositioning ? tempOffsetY : (offsetY / 100) * imageHeight}px)`,
		cursor: isRepositioning ? (dragging ? "grabbing" : "grab") : "default",
		userSelect: isRepositioning ? "none" : "auto",
    };

    const onChangeCoverImage = () => {
        fileInputRef.current?.click()
    }
    const onCoverImageUpload: ChangeEventHandler<HTMLInputElement> = async (event) => {
        const target = event.target;
        const file = target?.files?.[0];

        if (!file) return;

        try {
            const result = await uploadImage(file);

            const { error } = await supabase
                .from("pages")
                .update({ cover: result?.filePath, cover_offset_y: 0 })
                .eq("id", pageId)
                .eq("created_by", userId);

            if (error) throw error;

            changePageCover(result?.filePath || '');
            setOffsetY(0);

        } catch (error: any) {
            setErrorMessage("Failed to upload cover image");
        }
    }

   const startReposition = () => {
        if (!imageRef.current || !containerRef.current) return;
        setImageHeight(imageRef.current.offsetHeight);
        setContainerHeight(containerRef.current.offsetHeight);

        setTempOffsetY((offsetY / 100) * imageHeight);
        setIsRepositioning(true);
    };


	const cancelReposition = () => {
		setIsRepositioning(false);
	};

    const saveReposition = async () => {
        let clamped = tempOffsetY;
        const minOffset = Math.min(0, containerHeight - imageHeight);
        clamped = Math.max(minOffset, Math.min(clamped, 0));
    
        try {
            const { error } = await supabase
                .from("pages")
                .update({ cover_offset_y: (clamped / imageHeight) * 100 })
                .eq("id", pageId)
                .eq("created_by", userId);

            if (error) throw error;
            setOffsetY((clamped / imageHeight) * 100);
            setTempOffsetY(clamped);
            setIsRepositioning(false);
        } catch (error: any) {
            setErrorMessage("Failed to save cover position");
        }
    };    

    useEffect(() => {
        if (imageRef.current && containerRef.current) {
            setImageHeight(imageRef.current.offsetHeight);
            setContainerHeight(containerRef.current.offsetHeight);
        }
    }, [filePath]);

    useEffect(() => {
        if (!isMobile) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            setShowButtons(false);
            }
        };

        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [isMobile]);


    return (
        <div className={styles.cover} ref={containerRef} data-testid="cover-container" onClick={() => {
            if (isMobile && !isRepositioning) setShowButtons((prev) => !prev);
        }}>
            {
                filePath ? (
                    <FileImage className={styles.image} filePath={filePath} style={imageStyle} data-testid="cover-image" onMouseDown={onMouseDown} onTouchStart={onTouchStart} draggable={false} ref={imageRef} onLoad={onImageLoad} />
                ) : (
                    <img src="./src/Page/noted-cover.png" alt="Cover" className={styles.image} style={imageStyle} data-testid="cover-image" onMouseDown={onMouseDown} onTouchStart={onTouchStart} draggable={false} ref={imageRef} onLoad={onImageLoad} />
                )
            }
             {(!isMobile || showButtons) && !isRepositioning && (
                <div className={styles.coverButtons} data-testid="buttons">
                <button className={styles.repositionButton} onClick={startReposition} data-testid="reposition">
                    Reposition
                </button>
                <button className={styles.button} onClick={onChangeCoverImage}>
                    Change cover photo
                </button>
                </div>
            )}

            {isRepositioning && (
                <div className={styles.repositionOverlay} data-testid="reposition-overlay">
                    <div className={styles.repositionText}>Drag to reposition</div>
                </div>
            )}

            {/* Always show reposition controls when active */}
            {isRepositioning && (
                <div className={styles.repositionControls}>
                <button onClick={saveReposition} data-testid="save">Save</button>
                <button onClick={cancelReposition} data-testid="cancel">Cancel</button>
                </div>
            )}
            {errorMessage && (
                <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />
            )}
            <input onChange={onCoverImageUpload} style={{ display: "none" }} ref={fileInputRef} type="file" accept="image/*" />
        </div>
    )
}