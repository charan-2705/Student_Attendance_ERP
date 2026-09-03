import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';

interface NotificationItem {
  id: string | number;
  title: string;
  message: string;
  created_at: string;
  is_read: number | boolean;
  type?: 'ATTENDANCE_ALERT' | 'LEAVE_STATUS' | 'ACADEMIC_UPDATE';
}

interface NotificationDrawerProps {
  currentUser: {
    username: string;
    role?: string;
  };
}

export default function NotificationDrawer({
  currentUser
}: NotificationDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = notifications.filter(
    n => Number(n.is_read) === 0
  ).length;

  const fetchNotificationHistory = () => {
    const currentToken = localStorage.getItem('erp_session_token');

    if (!currentToken) return;

    fetch('http://localhost:5000/api/notifications', {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }

        return res.json();
      })
      .then(data => {
        console.log('Notification API response:', data);

        const notificationList: NotificationItem[] = Array.isArray(data)
          ? data
          : Array.isArray(data.notifications)
          ? data.notifications
          : [];

        setNotifications(notificationList);
      })
      .catch(err => {
        console.error('Failed to read notifications:', err);
        setNotifications([]);
      });
  };

  useEffect(() => {
    if (currentUser?.username) {
      fetchNotificationHistory();
    }
  }, [currentUser?.username, isOpen]);

  const markAllAsRead = () => {
    const currentToken = localStorage.getItem('erp_session_token');

    if (!currentToken) return;

    fetch('http://localhost:5000/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }

        return res.json();
      })
      .then(data => {
        if (data.success) {
          setNotifications(prev =>
            prev.map(notification => ({
              ...notification,
              is_read: 1
            }))
          );
        }
      })
      .catch(err => {
        console.error('Could not mark notifications as read:', err);
      });
  };

  const formatNotificationTime = (dateString: string) => {
    if (!dateString) return '';

    const dateObj = new Date(dateString);

    return dateObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
    >
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
      >
        <Bell size={22} color="#4b5563" />

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '10px',
              padding: '2px 6px',
              minWidth: '18px',
              textAlign: 'center',
              boxShadow: '0 0 0 2px #ffffff'
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Drawer */}
      {isOpen && (
        <>
          {/* Click outside overlay */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '45px',
              right: '0',
              width: '360px',
              maxHeight: '480px',
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow:
                '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              border: '1px solid #e5e7eb',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f9fafb'
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: '#111827',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                Live Action Streams
              </h4>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8b5cf6',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CheckCheck size={14} />
                  Mark read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                padding: '8px 0'
              }}
            >
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '13px'
                  }}
                >
                  No active exceptions or system triggers registered.
                </div>
              ) : (
                notifications.map(item => {
                  const isRead = Number(item.is_read) === 1;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        background: isRead ? '#ffffff' : '#f5f3ff',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <span
                          style={{
                            fontWeight: '600',
                            fontSize: '13px',
                            color: isRead ? '#374151' : '#111827'
                          }}
                        >
                          {item.title}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            color: '#9ca3af',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatNotificationTime(item.created_at)}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#4b5563',
                          lineHeight: '1.4'
                        }}
                      >
                        {item.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}