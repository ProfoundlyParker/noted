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

type PageNodeProps = {
    node?: NodeData;
}

export const Page = ({ node }: PageNodeProps) => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [numericId, setNumericId] = useState<number | null>(null);
    const {title, nodes, addNode, cover, setCoverImage, reorderNodes, setTitle, isCommanPanelOpen} = useAppState();
    const [focusedNodeIndex, setFocusedNodeIndex] = useFocusedNodeIndex({ nodes });
    const [emoji, setEmoji] = useState("📃");
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    function getCaretCoordinates(): { x: number; y: number } | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

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
        const { data, error } = await supabase.auth.getUser();
        if (data?.user?.id) {
        setUserId(data.user.id);
        } else {
        console.error("User not found:", error);
        }
    };
    getUser();
    }, []);

    const handleBackClick = () => {
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
                console.error('Error fetching page data:', error);
                return;
            }

            // If data is returned, set the numeric ID
            if (data?.id) {
                setNumericId(data.id);  // Assuming 'id' is an integer in your table
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchPageId();
        const fetchPageData = async () => {
            const slug = node?.value || id || "start";
            if (!slug) {
                return;
            }
            const { data: user } = await supabase.auth.getUser();
    
            try {
                const { data, error } = await supabase
                    .from("pages")
                    .select("emoji, title")
                    .eq("slug", slug)
                    .eq("created_by", userId)
                    .single();
    
                if (error && error.code === "PGRST116") {
                    return;
                }
    
                if (error) {
                    return;
                }
    
                if (data) {
                    setTitle(data.title || "Untitled Page");
                    setEmoji(data.emoji || "📃");
                }
            } catch (err) {
                console.error("Unexpected error:", err);
            }
        };
    
        fetchPageData();
    }, [id, node?.value, setTitle, userId]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isCommanPanelOpen) return;
            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (focusedNodeIndex > 0) {
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
                    event.preventDefault();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [focusedNodeIndex, nodes.length, isCommanPanelOpen]);

    

    const handleEmojiClick = async (emojiObject: EmojiClickData) => {
        const selectedEmoji = emojiObject.emoji;
        setEmoji(selectedEmoji);
        setShowPicker(false);
    
        const slug = node?.value || id || "start";
        if (selectedEmoji && slug) {
            const { error } = await supabase
                .from("pages")
                .update({ emoji: selectedEmoji })
                .eq("slug", slug)
                .eq("created_by", userId);
    
            if (error) {
                console.error("Error updating emoji:", error);
                return;
            }
 
            const { data } = await supabase
                .from("pages")
                .select("emoji, title")
                .eq("slug", slug)
                .eq("created_by", userId)
                .single();
    
            if (data) {
                setTitle(data.title);
                setEmoji(data.emoji || "📃");
            }
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
        setTitle(newTitle); 

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
            const slug = node?.value || id || "start";
            if (!slug || !userId) return;

            const { error } = await supabase
                .from("pages")
                .update({ title: newTitle })
                .eq("slug", slug)
                .eq("created_by", userId);

            if (error) {
                console.error("Error saving title:", error);
            }
        }, 200);
    };


    return (
        <>
        {id && (
                <button onClick={handleBackClick} className={styles.backButton}>Previous Page</button>
            )}
        <PageIdContext.Provider value={numericId?.toString()}>
            <div className={styles.coverWrapper}>
            <Cover filePath={cover} changePageCover={setCoverImage} pageId={numericId} />
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
                            {group.map((node, indexInGroup) => (
                                <li key={node.id} style={{ listStyleType: "decimal" }}>
                                <SortableNumberedListNode
                                    node={node}
                                    index={nodes.findIndex(n => n.id === node.id)}
                                    isFocused={focusedNodeIndex === nodes.findIndex(n => n.id === node.id)}
                                    updateFocusedIndex={setFocusedNodeIndex}
                                    registerRef={(i, el) => nodeRefs.current.set(i, el)}
                                    />
                                </li>
                            ))}
                            </ol>
                        );
                        } else {
                        const index = nodes.findIndex(n => n.id === group.id);
                        return (
                            <NodeContainer
                            key={group.id}
                            node={group}
                            index={index}
                            isFocused={focusedNodeIndex === index}
                            updateFocusedIndex={setFocusedNodeIndex}
                            registerRef={(i, el) => nodeRefs.current.set(i, el)}
                            />
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
        </PageIdContext.Provider>
        </>
    )
}