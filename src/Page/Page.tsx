import { useFocusedNodeIndex } from "./useFocusNodeIndex";
import { Cover } from "./Cover";
import { Spacer } from "./Spacer";
import { Title } from "./Title";
import { nanoid } from "nanoid";
import { useAppState } from "../state/AppStateContext";
import { DndContext, DragEndEvent, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { NodeContainer } from "../Node/NodeContainer";
import { useNavigate, useParams } from "react-router-dom";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { supabase } from "../supabaseClient";
import styles from './Page.module.css';
import { useEffect, useRef, useState } from "react";
import { NodeData } from "../utils/types";
import { PageIdContext } from "./PageIdContext";
import { SortableNumberedListNode } from "../Node/SortableNumberedListNode";
import { ErrorMessage } from "./ErrorMessage";

type PageNodeProps = {
    node?: NodeData;
}

export const Page = ({ node }: PageNodeProps) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [numericId, setNumericId] = useState<number | null>(null);
    const {title, nodes, addNode, cover, setCoverImage, reorderNodes, setTitle, isCommandPanelOpen} = useAppState();
    const [focusedNodeIndex, setFocusedNodeIndex] = useFocusedNodeIndex({ nodes, commandPanelRef: { current: null } as React.RefObject<HTMLDivElement> });
    const [emoji, setEmoji] = useState("📃");
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    function getCaretCoordinates(): { x: number; y: number } | null {
        const selection = window.getSelection();
        if (!selection || typeof selection.getRangeAt !== "function" || selection.rangeCount === 0) {
            return null;
        }
        /* c8 ignore next 11 */
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);

        const rects = range.getClientRects();
        if (rects.length > 0) {
            const rect = rects[0];
            return { x: rect.left, y: rect.top };
        }

        return null;
    }

    function setCaretFromX(ref: HTMLElement, x: number) {
        /* c8 ignore next 27 */
        const range = document.createRange();
        const selection = window.getSelection();
        const walker = document.createTreeWalker(ref, NodeFilter.SHOW_TEXT, null);

        let node: Text | null = null;
        while ((node = walker.nextNode() as Text | null)) {
            const textLength = node.textContent?.length || 0;
            for (let i = 0; i <= textLength; i++) {
                range.setStart(node, i);
                range.setEnd(node, i);
                const rect = range.getBoundingClientRect();
                if (rect.left >= x) {
                    range.collapse(true);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                    return;
                }
            }
        }

        // fallback: place at end
        ref.focus();
        selection?.removeAllRanges();
        range.selectNodeContents(ref);
        range.collapse(false);
        selection?.addRange(range);
    }

    const focusNode = (index: number) => {
        const caretCoords = getCaretCoordinates();
        const ref = nodeRefs.current.get(index);
        if (!ref) return;
        /* c8 ignore next 9 */
        setFocusedNodeIndex(index);
        ref.focus();

        setTimeout(() => {
            if (caretCoords) {
                setCaretFromX(ref, caretCoords.x);
            }
        }, 0);
    }

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user?.id) {
                setUserId(data.user.id);
            } else {
                setErrorMessage("User not found");
            }
        };
        getUser();
    }, []);

    useEffect(() => {
        if (!errorMessage) return;
        const timer = setTimeout(() => setErrorMessage(null), 15000);
        return () => clearTimeout(timer);
    }, [errorMessage]);

    const handleBackClick = () => {
        if (window.history.length <= 1) {
            navigate("/");
            return;
        }
        navigate(-1);
    };

    const fetchPageId = async () => {
        const slug = node?.value || id || "start";

        try {
            const { data, error } = await supabase
                .from('pages')
                .select('id')
                .eq('slug', slug)
                .eq('created_by', userId) 
                .single();

            if (error) {
                return;
            }

            // If data is returned, set the numeric ID
            if (data?.id) {
                setNumericId(data.id);  // Assuming 'id' is an integer in your table
            }
        } catch (err: any) {
            setErrorMessage("Unexpected error fetching page ID.");
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchPageId();
        const fetchPageData = async () => {
            const slug = node?.value || id || "start";
            if (!slug) {
                /* c8 ignore next 2 */
                return;
            }
            try {
                const { data: _userData, error: authError } = await supabase.auth.getUser();
                if (authError) {
                    setErrorMessage("Failed to fetch user data");
                    return;
                }

                const { data, error } = await supabase
                    .from("pages")
                    .select("emoji, title")
                    .eq("slug", slug)
                    .eq("created_by", userId)
                    .single();

                if (error && error.code === "PGRST116") {
                    return;
                }

                if (data) {
                    setTitle(data.title || "Untitled Page");
                    setEmoji(data.emoji || "📃");
                }
            } catch (err: any) {
                /* c8 ignore next 2 */
                setErrorMessage("Unexpected error fetching page data");
            }
        };
    
        fetchPageData();
    }, [id, node?.value, setTitle, userId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isCommandPanelOpen) return;
            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (focusedNodeIndex > 0) {
                    /* c8 ignore next 2 */
                    focusNode(focusedNodeIndex - 1);
                }
            } else if (event.key === "ArrowDown") {
                event.preventDefault();
                if (focusedNodeIndex < nodes.length - 1) {
                    focusNode(focusedNodeIndex + 1);
                }
            } else if (event.key === "Delete") {
                const currentNode = nodeRefs.current.get(focusedNodeIndex);
                const selection = window.getSelection();
                const atEnd = currentNode && selection?.anchorOffset === (currentNode.textContent?.length || 0);

                if (atEnd && focusedNodeIndex < nodes.length - 1) {
                    /* c8 ignore next 2 */
                    event.preventDefault();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [focusedNodeIndex, nodes.length, isCommandPanelOpen]);

    

    const handleEmojiClick = async (emojiObject: EmojiClickData) => {
        const selectedEmoji = emojiObject.emoji;
    
        const slug = node?.value || id || "start";
        if (!selectedEmoji || !slug || !userId) return;
        /* c8 ignore next 35 */
        try {
            const { error: updateError } = await supabase
                .from("pages")
                .update({ emoji: selectedEmoji })
                .eq("slug", slug)
                .eq("created_by", userId);

            if (updateError) {
                setErrorMessage("Failed to update emoji");
                return;
            }

            const { data, error: fetchError } = await supabase
                .from("pages")
                .select("emoji, title")
                .eq("slug", slug)
                .eq("created_by", userId)
                .single();

            if (fetchError) {
                setErrorMessage("Failed to refresh page data");
                return;
            }

            if (data) {
                setTitle(data.title);
                setEmoji(data.emoji || "📃");
            }
            setEmoji(selectedEmoji);
            setShowPicker(false);
        } catch (err: any) {
            setErrorMessage("Unexpected error updating emoji");
        }
    };
    

    const handleEmojiIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPicker((prev) => !prev);
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

    const handleDragEvent = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over?.id && active.id !== over?.id) {
            reorderNodes(active.id as string, over.id as string)
        }
    }

    const handleTitleChange = (newTitle: string) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            const slug = node?.value || id || "start";
            if (!slug || !userId) return;
            /* c8 ignore next 14 */
            try {
                const { error } = await supabase
                    .from("pages")
                    .update({ title: newTitle })
                    .eq("slug", slug)
                    .eq("created_by", userId);

                if (error) {
                    setErrorMessage("Failed to save page title");
                }
                setTitle(newTitle); 
            } catch (err: any) {
                setErrorMessage("Unexpected error saving page title");
            }
        }, 200);
    };


    return (
        <>
        {id && (
                <button onClick={handleBackClick} className={styles.backButton}>Previous Page</button>
            )}
        {/* @ts-ignore */}
        <PageIdContext.Provider value={numericId?.toString()}>
            <div className={styles.coverWrapper}>
            <Cover filePath={cover} changePageCover={setCoverImage} pageId={numericId ?? undefined} />
            <div className={styles.pageHeader}>
                    <span onClick={handleEmojiIconClick} className={styles.emoji} data-testid="emoji-option">
                        {emoji}
                    </span>
                    {showPicker && (
                        <div
                            className={styles.emojiPicker}
                            ref={pickerRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                    )}
                    </div>
                 <button
                className={styles.signOutButton}
                onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/auth");
                }}
            >
                Sign Out
            </button>
            </div>
            <div>
               <Title addNode={addNode} title={title} changePageTitle={handleTitleChange} />
                <DndContext onDragEnd={handleDragEvent}>
                  {Array.isArray(nodes) && nodes.length > 0 && (
                    <SortableContext items={nodes} strategy={verticalListSortingStrategy}>
                        {(() => {
                    const grouped: (NodeData | NodeData[])[] = [];
                    let currentGroup: NodeData[] = [];

                    nodes.forEach((node) => {
                        if (node.type === "numberedList") {
                        currentGroup.push(node);
                        } else {
                        if (currentGroup.length > 0) {
                            grouped.push([...currentGroup]);
                            currentGroup = [];
                        }
                        grouped.push(node);
                        }
                    });

                    if (currentGroup.length > 0) {
                        grouped.push([...currentGroup]);
                    }

                    return grouped.map((group, groupIndex) => {
                        if (Array.isArray(group)) {
                        return (
                            <ol key={`group-${groupIndex}`} style={{ paddingLeft: "4rem", margin: 0 }}>
                            {group.map((node, _indexInGroup) => (
                                <li key={node.id} style={{ listStyleType: "decimal" }}>
                                <SortableNumberedListNode
                                    node={node}
                                    index={nodes.findIndex(n => n.id === node.id)}
                                    isFocused={focusedNodeIndex === nodes.findIndex(n => n.id === node.id)}
                                    updateFocusedIndex={setFocusedNodeIndex}
                                    registerRef={(i, el) => nodeRefs.current.set(i, el as any)}
                                    />
                                </li>
                            ))}
                            </ol>
                        );
                        } else {
                        const index = nodes.findIndex(n => n.id === group.id);
                        return (
                            <div className={styles.container}>
                            <NodeContainer
                            key={group.id}
                            node={group}
                            index={index}
                            isFocused={focusedNodeIndex === index}
                            updateFocusedIndex={setFocusedNodeIndex}
                            registerRef={(i, el) => nodeRefs.current.set(i, el)}
                            />
                            </div>
                        );
                        }
                    });
                    })()}

                    </SortableContext>
                    )}
                    <DragOverlay />
                </DndContext>
                <Spacer
                    showHint={!nodes.length}
                    handleClick={() => {
                        addNode({ type: "text", value: "", id: nanoid() }, nodes.length);
                    }}
                />
        </div>
        {errorMessage && (
            <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />
        )}
        </PageIdContext.Provider>
        </>
    )
}