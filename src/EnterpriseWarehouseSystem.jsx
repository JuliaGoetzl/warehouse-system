import React, { useState, useEffect } from 'react';

const EnterpriseWarehouseSystem = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'lagerarbeiter' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const saved = localStorage.getItem('warehouseUsers');
    const savedOrders = localStorage.getItem('warehouseOrders');
    const savedLog = localStorage.getItem('activityLog');
    
    if (saved) setUsers(JSON.parse(saved));
    else {
      const defaultUsers = [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
        { id: 2, username: 'lagerleiter', password: 'lager123', role: 'lagerleiter', name: 'Max Müller' },
        { id: 3, username: 'arbeiter1', password: 'work123', role: 'lagerarbeiter', name: 'Peter Schmidt' },
        { id: 4, username: 'arbeiter2', password: 'work123', role: 'lagerarbeiter', name: 'Anna Weber' }
      ];
      setUsers(defaultUsers);
      localStorage.setItem('warehouseUsers', JSON.stringify(defaultUsers));
    }

    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedLog) setActivityLog(JSON.parse(savedLog));

    window.addEventListener('resize', () => setIsMobile(window.innerWidth < 768));
    return () => window.removeEventListener('resize', () => setIsMobile(window.innerWidth < 768));
  }, []);

  useEffect(() => {
    localStorage.setItem('warehouseUsers', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('warehouseOrders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('activityLog', JSON.stringify(activityLog));
  }, [activityLog]);

  const logActivity = (action, details) => {
    if (currentUser) {
      const newLog = {
        id: Date.now(),
        userId: currentUser.id,
        username: currentUser.username,
        name: currentUser.name,
        action,
        details,
        timestamp: new Date().toISOString()
      };
      setActivityLog([newLog, ...activityLog]);
    }
  };

  const handleLogin = () => {
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      logActivity('Login', 'Benutzer angemeldet');
      setLoginForm({ username: '', password: '' });
    } else {
      alert('Benutzername oder Passwort falsch');
    }
  };

  const handleLogout = () => {
    logActivity('Logout', 'Benutzer abgemeldet');
    setCurrentUser(null);
  };

  const createUser = () => {
    if (!newUser.username || !newUser.password) {
      alert('Benutzername und Passwort erforderlich');
      return;
    }
    const user = {
      id: Date.now(),
      username: newUser.username,
      password: newUser.password,
      role: newUser.role,
      name: newUser.username.charAt(0).toUpperCase() + newUser.username.slice(1)
    };
    setUsers([...users, user]);
    logActivity('User erstellt', `Neuer Benutzer: ${newUser.username} (${newUser.role})`);
    setNewUser({ username: '', password: '', role: 'lagerarbeiter' });
    setShowUserForm(false);
    alert('Benutzer erstellt!');
  };

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const newOrders = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim());
          const order = {
            id: Date.now() + i,
            supplier: values[headers.indexOf('supplier')] || 'N/A',
            partNumber: values[headers.indexOf('partnumber')] || 'N/A',
            quantity: parseInt(values[headers.indexOf('quantity')]) || 0,
            itemsReceived: parseInt(values[headers.indexOf('itemsreceived')] || 0),
            status: values[headers.indexOf('status')] || 'Bestellt',
            orderDate: values[headers.indexOf('orderdate')] || new Date().toLocaleDateString('de-DE'),
            expectedDate: values[headers.indexOf('expecteddate')] || '',
            importedBy: currentUser.username,
            importedAt: new Date().toISOString()
          };
          newOrders.push(order);
        }

        setOrders([...orders, ...newOrders]);
        logActivity('Excel-Import', `${newOrders.length} Bestellungen importiert`);
        alert(`✓ ${newOrders.length} Bestellungen erfolgreich importiert!`);
        e.target.value = '';
      } catch (error) {
        alert('Fehler beim Import: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const exportBackup = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      users: users.filter(u => u.id !== 1),
      orders,
      activityLog
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-backup-${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.json`;
    a.click();
    
    logActivity('Backup erstellt', 'Vollständiges System-Backup exportiert');
    alert('✓ Backup erfolgreich erstellt!');
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        setUsers([...users, ...backup.users]);
        setOrders([...orders, ...backup.orders]);
        setActivityLog([...activityLog, ...backup.activityLog]);
        logActivity('Backup wiederhergestellt', 'System-Backup importiert');
        alert('✓ Backup erfolgreich wiederhergestellt!');
        e.target.value = '';
      } catch (error) {
        alert('Fehler beim Importieren: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  if (!currentUser) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '1rem'
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: isMobile ? '2rem 1.5rem' : '3rem 2rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: isMobile ? '100%' : '400px'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '500', margin: '0 0 2rem', textAlign: 'center', color: '#1F2937' }}>
            🏭 Lagerverwaltung
          </h1>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Benutzername</label>
            <input
              type="text"
              placeholder="z.B. lagerleiter"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px', border: '0.5px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '14px', color: '#6B7280', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Passwort</label>
            <input
              type="password"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '10px', border: '0.5px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', marginBottom: '1rem' }}
          >
            Anmelden
          </button>

          <div style={{ background: '#F3F4F6', border: '0.5px solid #D1D5DB', borderRadius: '8px', padding: '1rem', fontSize: '12px', color: '#374151' }}>
            <strong>Demo-Benutzer:</strong><br/>
            Admin: admin / admin123<br/>
            Lagerleiter: lagerleiter / lager123<br/>
            Arbeiter: arbeiter1 / work123
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <div style={{ background: '#667eea', color: 'white', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '500', margin: '0' }}>🏭 Lagerverwaltung</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: isMobile ? '12px' : '14px' }}>
          <span>👤 {currentUser.name}</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
            {currentUser.role === 'admin' ? '👑 Admin' : currentUser.role === 'lagerleiter' ? '📋 Lagerleiter' : '👷 Lagerarbeiter'}
          </span>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderBottom: '0.5px solid #e5e7eb', padding: isMobile ? '0.5rem' : '0 1rem', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'wareneingang', label: '📥 Wareneingang' },
          currentUser.role !== 'lagerarbeiter' && { id: 'excel', label: '📤 Excel-Import' },
          currentUser.role === 'admin' && { id: 'users', label: '👥 Benutzer' },
          currentUser.role === 'admin' && { id: 'backup', label: '💾 Backup' },
          { id: 'activity', label: '📋 Activity-Log' }
        ].filter(Boolean).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: isMobile ? '8px 12px' : '12px 16px',
              background: activeTab === tab.id ? '#667eea' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#6B7280',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: activeTab === tab.id ? '500' : '400',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '500', marginBottom: '1.5rem' }}>📊 Dashboard</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px' }}>Bestellungen</p>
                <p style={{ fontSize: '32px', fontWeight: '500', margin: '0' }}>{orders.length}</p>
              </div>
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px' }}>Teile insgesamt</p>
                <p style={{ fontSize: '32px', fontWeight: '500', margin: '0' }}>{orders.reduce((sum, o) => sum + o.quantity, 0)}</p>
              </div>
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px' }}>Angekommen</p>
                <p style={{ fontSize: '32px', fontWeight: '500', margin: '0', color: '#10B981' }}>{orders.reduce((sum, o) => sum + o.itemsReceived, 0)}</p>
              </div>
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px' }}>Benutzer aktiv</p>
                <p style={{ fontSize: '32px', fontWeight: '500', margin: '0' }}>{users.length}</p>
              </div>
            </div>

            <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 1rem' }}>Letzte Aktivitäten</h3>
              {activityLog.slice(0, 5).map(log => (
                <div key={log.id} style={{ padding: '12px', borderBottom: '0.5px solid #e5e7eb', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: '0', fontWeight: '500' }}>{log.name} · {log.action}</p>
                    <p style={{ margin: '0', color: '#6B7280', fontSize: '12px' }}>{log.details}</p>
                  </div>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wareneingang' && (
          <div>
            <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '500', marginBottom: '1.5rem' }}>📥 Wareneingang</h2>
            
            {orders.length === 0 ? (
              <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                Keine Bestellungen vorhanden. Importiere Daten via Excel.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {orders.filter(o => o.status !== 'Verbucht').map(order => (
                  <div key={order.id} style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>{order.supplier}</p>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0' }}>Teil: {order.partNumber}</p>
                      </div>
                      <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>Menge: {order.itemsReceived}/{order.quantity}</p>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: '0' }}>{order.status}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        value={order.itemsReceived}
                        onChange={(e) => {
                          const updated = orders.map(o => o.id === order.id ? { ...o, itemsReceived: parseInt(e.target.value) || 0 } : o);
                          setOrders(updated);
                          logActivity('Menge aktualisiert', `${order.partNumber}: ${e.target.value} Teile`);
                        }}
                        style={{ flex: 1, minWidth: '80px', padding: '8px', border: '0.5px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                      />
                      <button
                        onClick={() => {
                          const updated = orders.map(o => o.id === order.id ? { ...o, status: 'Verbucht' } : o);
                          setOrders(updated);
                          logActivity('Wareneingang verbucht', `${order.partNumber} - ${order.itemsReceived} Teile`);
                          alert('✓ Bestellung verbucht!');
                        }}
                        style={{ padding: '8px 16px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                      >
                        ✓ Verbuchen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'excel' && currentUser.role !== 'lagerarbeiter' && (
          <div>
            <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '500', marginBottom: '1.5rem' }}>📤 Excel/CSV Import</h2>
            
            <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '2rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '1rem' }}>Bestellungen importieren</h3>
              
              <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '2px dashed #d1d5db', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 1rem' }}>CSV-Datei auswählen</p>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleExcelImport}
                  style={{ padding: '8px 12px', border: '0.5px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div style={{ background: '#E0F2FE', border: '0.5px solid #BAE6FD', borderRadius: '8px', padding: '1rem', color: '#0C4A6E', fontSize: '12px' }}>
                <strong>📋 CSV-Format erforderlich:</strong><br/>
                supplier,partNumber,quantity,itemsReceived,status,orderDate,expectedDate<br/><br/>
                <strong>Beispiel:</strong><br/>
                Elektro-Müller,EM-2024,50,25,Teilweise angekommen,10.01.2024,15.01.2024
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div>
            <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '500', marginBottom: '1.5rem' }}>👥 Benutzerverwaltung</h2>
            
            <button
              onClick={() => setShowUserForm(!showUserForm)}
              style={{ marginBottom: '1.5rem', padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              {showUserForm ? '✕ Abbrechen' : '+ Neuer Benutzer'}
            </button>

            {showUserForm && (
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Benutzername"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    style={{ padding: '10px', border: '0.5px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                  />
                  <input
                    type="password"
                    placeholder="Passwort"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    style={{ padding: '10px', border: '0.5px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '0.5px solid #d1d5db', borderRadius: '4px', fontSize: '14px', marginBottom: '1rem' }}
                >
                  <option value="lagerarbeiter">Lagerarbeiter</option>
                  <option value="lagerleiter">Lagerleiter</option>
                </select>
                <button
                  onClick={createUser}
                  style={{ width: '100%', padding: '10px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                >
                  Benutzer erstellen
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
              {users.map(user => (
                <div key={user.id} style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: '0' }}>{user.name}</p>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: '0' }}>{user.username}</p>
                    </div>
                    <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '4px', background: user.role === 'admin' ? '#FEE2E2' : '#DBEAFE', color: user.role === 'admin' ? '#7F1D1D' : '#0C4A6E' }}>
                      {user.role === 'admin' ? '👑 Admin' : user.role === 'lagerleiter' ? '📋 Lagerleiter' : '👷 Lagerarbeiter'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'backup' && currentUser.role === 'admin' && (
          <div>
            <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '500', marginBottom: '1.5rem' }}>💾 Backup & Wiederherstellung</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 1rem' }}>📥 Backup exportieren</h3>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 1rem' }}>Speichere alle Daten als JSON-Datei</p>
                <button
                  onClick={exportBackup}
                  style={{ width: '100%', padding: '12px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                >
                  ✓ Backup erstellen
                </button>
              </div>

              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 1rem' }}>📤 Backup wiederherstellen</h3>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 1rem' }}>Lade eine zuvor gespeicherte Backup-Datei</p>
                <input
                  type="file"
                  accept=".json"
                  onChange={importBackup}
                  style={{ width: '100%', padding: '10px', border: '0.5px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '2rem', background: '#E0F2FE', border: '0.5px solid #BAE6FD', borderRadius: '8px', padding: '1rem', color: '#0C4A6E', fontSize: '12px', lineHeight: '1.6' }}>
              <strong>💡 Cloud-Speicherung:</strong><br/>
              1. Backup erstellen (linker Button)<br/>
              2. Speichere die Datei in: Dropbox / Google Drive / OneDrive<br/>
              3. ✓ Automatisches Backup kommt bald!
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '500', marginBottom: '1.5rem' }}>📋 Activity-Log</h2>
            
            {activityLog.length === 0 ? (
              <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                Noch keine Aktivitäten
              </div>
            ) : (
              <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '8px' }}>
                {activityLog.map(log => (
                  <div key={log.id} style={{ padding: '1rem', borderBottom: '0.5px solid #e5e7eb', display: isMobile ? 'block' : 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <p style={{ margin: '0', fontWeight: '500', fontSize: isMobile ? '13px' : '14px' }}>
                        {log.name} ({log.username})
                      </p>
                      <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '12px' }}>
                        <strong>{log.action}:</strong> {log.details}
                      </p>
                    </div>
                    <span style={{ color: '#9CA3AF', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString('de-DE')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseWarehouseSystem;
