"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Heading1, Heading2, Text, Quote, Code, Image as ImageIcon, Trash2, Sparkles } from "lucide-react"

export interface Block {
  id: string
  type: "paragraph" | "h1" | "h2" | "blockquote" | "code" | "image"
  text: string
  language?: string // For code blocks
}

interface BlockEditorProps {
  initialBlocks?: Block[]
  onChange: (blocks: Block[]) => void
}

export function BlockEditor({ initialBlocks, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks || [
      { id: "b1", type: "paragraph", text: "" }
    ]
  )
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>("b1")
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashQuery, setSlashQuery] = useState("")
  const [slashIndex, setSlashIndex] = useState(0)

  const blockRefs = useRef<{ [key: string]: HTMLDivElement | HTMLTextAreaElement | null }>({})

  // Propagate changes to parent
  useEffect(() => {
    onChange(blocks)
  }, [blocks, onChange])

  // Focus a block helper
  const focusBlock = (id: string) => {
    setFocusedBlockId(id)
    setTimeout(() => {
      const el = blockRefs.current[id]
      if (el) {
        el.focus()
        // Move cursor to end of text
        if (el instanceof HTMLTextAreaElement) {
          el.setSelectionRange(el.value.length, el.value.length)
        } else if (el instanceof HTMLDivElement) {
          const range = document.createRange()
          const sel = window.getSelection()
          range.selectNodeContents(el)
          range.collapse(false) // Collapse to end
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      }
    }, 10)
  }

  // Update a block's text
  const updateBlockText = (id: string, text: string) => {
    setBlocks(prev =>
      prev.map(block => {
        if (block.id !== id) return block

        // Markdown Shortcuts check
        if (block.type === "paragraph") {
          if (text.startsWith("# ")) {
            return { ...block, type: "h1", text: text.substring(2) }
          }
          if (text.startsWith("## ")) {
            return { ...block, type: "h2", text: text.substring(3) }
          }
          if (text.startsWith("> ")) {
            return { ...block, type: "blockquote", text: text.substring(2) }
          }
          if (text.startsWith("```")) {
            return { ...block, type: "code", text: "", language: "typescript" }
          }
        }

        // Slash command check
        const slashIndex = text.lastIndexOf("/")
        if (slashIndex !== -1) {
          const query = text.slice(slashIndex + 1)
          // Ensure it's not a slash inside URL or general text
          if (!text.includes("http://") && !text.includes("https://")) {
            setShowSlashMenu(true)
            setSlashQuery(query)
          }
        } else {
          setShowSlashMenu(false)
        }

        return { ...block, text }
      })
    )
  }

  // Change block type
  const changeBlockType = (id: string, type: Block["type"], extra: Partial<Block> = {}) => {
    setBlocks(prev =>
      prev.map(block => {
        if (block.id === id) {
          // Strip slash query if it was typed
          let cleanText = block.text
          const slashIdx = cleanText.lastIndexOf("/")
          if (slashIdx !== -1) {
            cleanText = cleanText.substring(0, slashIdx)
          }
          return { ...block, type, text: cleanText, ...extra }
        }
        return block
      })
    )
    setShowSlashMenu(false)
    setSlashQuery("")
    focusBlock(id)
  }

  // Add block below
  const addBlockBelow = (currentId: string, type: Block["type"] = "paragraph") => {
    const currentIndex = blocks.findIndex(b => b.id === currentId)
    const newBlock: Block = {
      id: `block-${Math.random().toString(36).substring(2, 9)}`,
      type,
      text: "",
    }
    const updatedBlocks = [...blocks]
    updatedBlocks.splice(currentIndex + 1, 0, newBlock)
    setBlocks(updatedBlocks)
    focusBlock(newBlock.id)
  }

  // Delete a block
  const deleteBlock = (id: string) => {
    if (blocks.length === 1) return // Keep at least one block
    const currentIndex = blocks.findIndex(b => b.id === id)
    const nextToFocus = blocks[currentIndex - 1]?.id || blocks[currentIndex + 1]?.id
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (nextToFocus) {
      focusBlock(nextToFocus)
    }
  }

  // Key handler
  const handleKeyDown = (e: React.KeyboardEvent, block: Block) => {
    const currentIndex = blocks.findIndex(b => b.id === block.id)

    // Handle slash menu keys
    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSlashIndex(prev => (prev + 1) % slashMenuItems.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSlashIndex(prev => (prev - 1 + slashMenuItems.length) % slashMenuItems.length)
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        const selected = filteredSlashItems[slashIndex]
        if (selected) {
          changeBlockType(block.id, selected.type, selected.extra)
        }
        return
      }
      if (e.key === "Escape") {
        setShowSlashMenu(false)
        return
      }
    }

    // Default editor keys
    if (e.key === "Enter") {
      // In code blocks, shift+enter creates a new block, standard Enter inserts a newline
      if (block.type === "code") {
        if (!e.shiftKey) {
          return // Let textarea handle default newline
        }
        e.preventDefault()
        addBlockBelow(block.id)
        return
      }
      
      e.preventDefault()
      addBlockBelow(block.id)
    }

    if (e.key === "Backspace" && block.text === "") {
      e.preventDefault()
      deleteBlock(block.id)
    }

    if (e.key === "ArrowUp" && currentIndex > 0) {
      e.preventDefault()
      focusBlock(blocks[currentIndex - 1].id)
    }

    if (e.key === "ArrowDown" && currentIndex < blocks.length - 1) {
      e.preventDefault()
      focusBlock(blocks[currentIndex + 1].id)
    }
  }

  const slashMenuItems: { label: string; desc: string; type: Block["type"]; icon: any; extra?: Partial<Block> }[] = [
    { label: "Text", desc: "Start writing standard text.", type: "paragraph", icon: Text },
    { label: "Heading 1", desc: "Large section header.", type: "h1", icon: Heading1 },
    { label: "Heading 2", desc: "Medium section header.", type: "h2", icon: Heading2 },
    { label: "Blockquote", desc: "Insert a quote callout.", type: "blockquote", icon: Quote },
    { label: "Code Block", desc: "Write syntax-highlighted code.", type: "code", icon: Code, extra: { language: "typescript" } },
    { label: "Image Block", desc: "Embed an article image URL.", type: "image", icon: ImageIcon },
  ]

  const filteredSlashItems = slashMenuItems.filter(item =>
    item.label.toLowerCase().includes(slashQuery.toLowerCase())
  )

  return (
    <div className="space-y-4 min-h-[400px] pb-20 relative">
      {blocks.map((block, index) => {
        const isFocused = focusedBlockId === block.id

        return (
          <div
            key={block.id}
            className="group relative flex items-start gap-2 pl-4 transition-all"
          >
            {/* Block Action Controls */}
            <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                onClick={() => addBlockBelow(block.id)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="Add block below"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteBlock(block.id)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-500 transition-colors"
                title="Delete block"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Block Render Cases */}
            <div className="flex-1">
              {block.type === "paragraph" && (
                <div
                  ref={el => { blockRefs.current[block.id] = el }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => updateBlockText(block.id, e.currentTarget.innerText)}
                  onKeyDown={e => handleKeyDown(e, block)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  className="outline-hidden font-sans text-base md:text-lg text-slate-800 dark:text-slate-200 leading-relaxed min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:empty:before:text-slate-600 empty:before:pointer-events-none"
                  data-placeholder="Type '/' for commands or start writing..."
                >
                  {block.text}
                </div>
              )}

              {block.type === "h1" && (
                <div
                  ref={el => { blockRefs.current[block.id] = el }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => updateBlockText(block.id, e.currentTarget.innerText)}
                  onKeyDown={e => handleKeyDown(e, block)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  className="outline-hidden font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight min-h-[1.2em] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:empty:before:text-slate-600 empty:before:pointer-events-none"
                  data-placeholder="Heading 1"
                >
                  {block.text}
                </div>
              )}

              {block.type === "h2" && (
                <div
                  ref={el => { blockRefs.current[block.id] = el }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => updateBlockText(block.id, e.currentTarget.innerText)}
                  onKeyDown={e => handleKeyDown(e, block)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  className="outline-hidden font-display text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-snug min-h-[1.2em] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 dark:empty:before:text-slate-600 empty:before:pointer-events-none"
                  data-placeholder="Heading 2"
                >
                  {block.text}
                </div>
              )}

              {block.type === "blockquote" && (
                <div className="border-l-4 border-brand-500 pl-4 py-1 italic bg-slate-100 dark:bg-slate-900 rounded-r">
                  <div
                    ref={el => { blockRefs.current[block.id] = el }}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={e => updateBlockText(block.id, e.currentTarget.innerText)}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onFocus={() => setFocusedBlockId(block.id)}
                    className="outline-hidden font-sans text-base text-slate-700 dark:text-slate-300 min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
                    data-placeholder="Quote"
                  >
                    {block.text}
                  </div>
                </div>
              )}

              {block.type === "code" && (
                <div className="relative font-mono bg-slate-900 dark:bg-slate-950 text-emerald-400 rounded-lg p-4 pt-10 border border-slate-800">
                  <div className="absolute top-2 left-4 text-xs text-slate-500 flex items-center gap-2">
                    <span>Code Editor</span>
                    <select
                      value={block.language || "typescript"}
                      onChange={e => {
                        const nextLang = e.target.value
                        setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, language: nextLang } : b))
                      }}
                      className="bg-slate-800 text-slate-400 border-none rounded px-1 outline-hidden"
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                      <option value="css">CSS</option>
                      <option value="html">HTML</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  <textarea
                    ref={el => { blockRefs.current[block.id] = el }}
                    value={block.text}
                    onChange={e => updateBlockText(block.id, e.target.value)}
                    onKeyDown={e => handleKeyDown(e, block)}
                    onFocus={() => setFocusedBlockId(block.id)}
                    placeholder="// Write your code here... (Shift + Enter to exit)"
                    className="w-full bg-transparent text-emerald-400 outline-hidden border-none resize-none font-mono text-sm min-h-[100px]"
                  />
                </div>
              )}

              {block.type === "image" && (
                <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50">
                  {block.text ? (
                    <div className="relative group/img rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={block.text} alt="Embedded" className="w-full h-auto max-h-[400px] object-cover" />
                      <button
                        onClick={() => updateBlockText(block.id, "")}
                        className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow hover:bg-red-700"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center py-4">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">Insert an image link below</p>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full max-w-md px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 outline-hidden focus:ring-1 focus:ring-brand-500"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            updateBlockText(block.id, e.currentTarget.value)
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Floating Slash Command Menu */}
            {isFocused && showSlashMenu && filteredSlashItems.length > 0 && (
              <div className="absolute left-[30px] top-[1.8em] z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto animate-fade-in">
                <p className="text-[10px] text-slate-400 font-medium px-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-500" />
                  <span>BLOCK TYPES</span>
                </p>
                <div className="py-1 space-y-0.5">
                  {filteredSlashItems.map((item, idx) => {
                    const Icon = item.icon
                    const isSelected = idx === slashIndex
                    return (
                      <button
                        key={item.label}
                        onClick={() => changeBlockType(block.id, item.type, item.extra)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                          isSelected
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md ${
                          isSelected ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{item.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
