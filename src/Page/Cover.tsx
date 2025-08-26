import { FileImage } from "../components/FileImage";
import { supabase } from "../supabaseClient";
import { uploadImage } from "../utils/uploadImage";
import styles from "./Cover.module.css";
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
            const { data, error } = await supabase
                .from("pages")
                .select("cover_offset_y")
                .eq("id", pageId)
                .eq("created_by", userId)
                .single();
    
            if (error) {
                console.error("Failed to load cover offset:", error);
            } else if (data) {
                setOffsetY(data.cover_offset_y ?? 0);
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


    const onImageLoad = () => {
        if (imageRef.current && containerRef.current) {
            const imgHeight = imageRef.current.offsetHeight;
            const contHeight = containerRef.current.offsetHeight;
            setImageHeight(imgHeight);
            setContainerHeight(contHeight);
            setTempOffsetY((offsetY / 100) * imgHeight);
        }
    };    

	const imageStyle = {
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

        try {
            if (file) {
                const result = await uploadImage(file);
                changePageCover(result.filePath);
                setOffsetY(0);
                await supabase
				.from("pages")
				.update({ cover: result.filePath, cover_offset_y: 0 })
				.eq("id", pageId)
                .eq("created_by", userId);
            }
        } catch (error) {
            console.log("Error uploading cover image:", error)
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

    
        setOffsetY((clamped / imageHeight) * 100);
        setTempOffsetY(clamped);
        setIsRepositioning(false);
    
        const { error } = await supabase
            .from("pages")
            .update({ cover_offset_y: (clamped / imageHeight) * 100 })
            .eq("id", pageId)
            .eq("created_by", userId);
    
        if (error) {
            console.error("Failed to save cover offset:", error);
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
                    <img src="./src/Page/Cover Image.png" alt="Cover" className={styles.image} style={imageStyle} data-testid="cover-image" onMouseDown={onMouseDown} onTouchStart={onTouchStart} draggable={false} ref={imageRef} />
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
            <input onChange={onCoverImageUpload} style={{ display: "none" }} ref={fileInputRef} type="file" />
        </div>
    )
}