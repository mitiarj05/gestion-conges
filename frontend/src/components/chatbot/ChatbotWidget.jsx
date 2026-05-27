// frontend/src/components/chatbot/ChatbotWidget.jsx
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function ChatbotWidget({ user, role }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: `Bonjour ${user?.prenom || ''} ! 👋 Je suis votre assistant RH. Je peux vous aider avec vos congés, bulletins de paie, et bien plus. Que puis-je faire pour vous ?`,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Détecter le thème actuel
    useEffect(() => {
        const checkTheme = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setIsDarkMode(isDark);
        };
        
        checkTheme();
        
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isMinimized]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: input.trim(),
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/chatbot/message`,
                {
                    message: input.trim(),
                    role,
                    history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.data.reply,
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (error) {
            console.error('Chatbot error:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: '❌ Désolé, une erreur s\'est produite. Veuillez réessayer.',
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now(),
            role: 'assistant',
            content: `Conversation réinitialisée. Comment puis-je vous aider, ${user?.prenom || ''} ?`,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    const suggestions = role === 'admin'
        ? ['📊 Stats employés', '💰 Bulletins de paie', '📋 Demandes en attente']
        : role === 'manager'
        ? ['👥 Mon équipe', '✅ Demandes à valider', '📅 Absences semaine']
        : ['📅 Mon solde congés', '📝 Faire une demande', '📄 Mes bulletins'];

    // Styles dynamiques selon le thème
    const themeStyles = {
        primaryGradient: isDarkMode 
            ? 'linear-gradient(135deg, #818cf8, #a78bfa)' 
            : 'linear-gradient(135deg, #667eea, #764ba2)',
        bgMain: isDarkMode ? '#1e293b' : '#ffffff',
        assistantBg: isDarkMode ? '#334155' : '#f1f5f9',
        assistantText: isDarkMode ? '#e2e8f0' : '#1e293b',
        userBg: isDarkMode ? '#6366f1' : '#667eea',
        userText: '#ffffff',
        inputBg: isDarkMode ? '#334155' : '#ffffff',
        inputText: isDarkMode ? '#e2e8f0' : '#1e293b',
        inputBorder: isDarkMode ? '#475569' : '#e2e8f0',
        suggestionBg: isDarkMode ? '#334155' : '#f1f5f9',
        suggestionText: isDarkMode ? '#cbd5e1' : '#475569',
        suggestionBorder: isDarkMode ? '#475569' : '#e2e8f0',
        botIconBg: isDarkMode ? '#818cf8' : '#667eea',
    };

    return (
        <>
            {/* Bouton flottant - PARFAITEMENT ROND */}
            <button
                onClick={() => { setIsOpen(!isOpen); setIsMinimized(false); }}
                className="chatbot-floating-btn"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(102,126,234,0.5)',
                    zIndex: 9999,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    fontSize: '24px',
                    outline: 'none',
                    padding: '0',
                    margin: '0',
                    lineHeight: '1',
                    WebkitTapHighlightColor: 'transparent',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                }}
                title="Assistant RH"
            >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {isOpen ? '✕' : '🤖'}
                </span>
            </button>

            {/* Fenêtre de chat */}
            {isOpen && (
                <div 
                    className="chatbot-window-container"
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '24px',
                        width: '380px',
                        height: isMinimized ? '56px' : '520px',
                        backgroundColor: themeStyles.bgMain,
                        borderRadius: '20px',
                        boxShadow: isDarkMode 
                            ? '0 20px 60px rgba(0,0,0,0.5)' 
                            : '0 20px 60px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 9998,
                        overflow: 'hidden',
                        transition: 'height 0.3s ease, background-color 0.3s ease',
                        border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
                    }}
                >
                    {/* Header */}
                    <div 
                        className="chatbot-header"
                        style={{
                            background: themeStyles.primaryGradient,
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            borderBottomLeftRadius: isMinimized ? '20px' : '0',
                            borderBottomRightRadius: isMinimized ? '20px' : '0'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px', 
                                height: '36px', 
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '18px'
                            }}>🤖</div>
                            <div>
                                <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>Assistant RH</div>
                                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                                    Propulsé par Groq AI
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                                onClick={clearChat} 
                                title="Nouvelle conversation" 
                                style={{ 
                                    background: 'rgba(255,255,255,0.15)', 
                                    border: 'none', 
                                    color: 'white', 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                🗑️
                            </button>
                            <button 
                                onClick={() => setIsMinimized(!isMinimized)} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.15)', 
                                    border: 'none', 
                                    color: 'white', 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '8px', 
                                    cursor: 'pointer', 
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isMinimized ? '▲' : '▼'}
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Zone des messages */}
                            <div 
                                className="chat-messages-container"
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    backgroundColor: themeStyles.bgMain
                                }}
                            >
                                {messages.map(msg => (
                                    <div 
                                        key={msg.id} 
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            gap: '8px',
                                            alignItems: 'flex-end'
                                        }}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div style={{ 
                                                width: '28px', 
                                                height: '28px', 
                                                borderRadius: '50%', 
                                                background: themeStyles.botIconBg, 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                fontSize: '14px', 
                                                flexShrink: 0 
                                            }}>🤖</div>
                                        )}
                                        <div style={{
                                            maxWidth: '75%',
                                            padding: '10px 14px',
                                            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                            background: msg.role === 'user' ? themeStyles.userBg : themeStyles.assistantBg,
                                            color: msg.role === 'user' ? themeStyles.userText : themeStyles.assistantText,
                                            fontSize: '13px',
                                            lineHeight: '1.5',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                        }}>
                                            {msg.content}
                                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>{msg.time}</div>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div style={{ 
                                                width: '28px', 
                                                height: '28px', 
                                                borderRadius: '50%', 
                                                background: themeStyles.userBg, 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                fontSize: '12px', 
                                                fontWeight: 'bold', 
                                                color: 'white', 
                                                flexShrink: 0 
                                            }}>
                                                {user?.prenom?.charAt(0) || user?.nom?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: themeStyles.botIconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                                        <div style={{ padding: '10px 16px', background: themeStyles.assistantBg, borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            {[0, 1, 2].map(i => (
                                                <div 
                                                    key={i} 
                                                    style={{
                                                        width: '6px', 
                                                        height: '6px', 
                                                        borderRadius: '50%',
                                                        background: isDarkMode ? '#818cf8' : '#667eea',
                                                        animation: 'bounce 1.2s infinite',
                                                        animationDelay: `${i * 0.2}s`
                                                    }} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Suggestions rapides */}
                            {messages.length <= 2 && (
                                <div style={{ 
                                    padding: '0 16px 8px', 
                                    display: 'flex', 
                                    gap: '6px', 
                                    flexWrap: 'wrap', 
                                    backgroundColor: themeStyles.bgMain 
                                }}>
                                    {suggestions.map((s, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => { 
                                                const cleanText = s.replace(/^[^\w\s]{1,2}\s*/, '');
                                                setInput(cleanText); 
                                                inputRef.current?.focus(); 
                                            }}
                                            style={{
                                                background: themeStyles.suggestionBg,
                                                border: `1px solid ${themeStyles.suggestionBorder}`,
                                                color: themeStyles.suggestionText,
                                                padding: '5px 12px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Zone de saisie */}
                            <div 
                                className="chat-input-area"
                                style={{
                                    padding: '12px 16px',
                                    borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'flex-end',
                                    flexShrink: 0,
                                    backgroundColor: themeStyles.bgMain,
                                    borderBottomLeftRadius: '20px',
                                    borderBottomRightRadius: '20px'
                                }}
                            >
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Posez votre question..."
                                    rows={1}
                                    style={{
                                        flex: 1,
                                        background: themeStyles.inputBg,
                                        border: `1px solid ${themeStyles.inputBorder}`,
                                        borderRadius: '14px',
                                        padding: '10px 14px',
                                        color: themeStyles.inputText,
                                        fontSize: '13px',
                                        resize: 'none',
                                        outline: 'none',
                                        maxHeight: '80px',
                                        lineHeight: '1.4',
                                        fontFamily: 'inherit'
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || loading}
                                    style={{
                                        width: '40px', 
                                        height: '40px',
                                        borderRadius: '14px',
                                        background: input.trim() && !loading ? themeStyles.primaryGradient : (isDarkMode ? '#334155' : '#e2e8f0'),
                                        border: 'none',
                                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0,
                                        color: input.trim() && !loading ? 'white' : (isDarkMode ? '#64748b' : '#94a3b8')
                                    }}
                                >
                                    {loading ? '⏳' : '➤'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                
                .chat-messages-container::-webkit-scrollbar {
                    width: 6px;
                }
                
                .chat-messages-container::-webkit-scrollbar-track {
                    background: ${isDarkMode ? '#334155' : '#f1f5f9'};
                    border-radius: 3px;
                }
                
                .chat-messages-container::-webkit-scrollbar-thumb {
                    background: ${isDarkMode ? '#475569' : '#cbd5e1'};
                    border-radius: 3px;
                }
                
                .chat-messages-container::-webkit-scrollbar-thumb:hover {
                    background: ${isDarkMode ? '#64748b' : '#94a3b8'};
                }
            `}</style>
        </>
    );
}

export default ChatbotWidget;