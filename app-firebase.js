// DEPRECATED: Firebase client UI removed. The app now uses Supabase-only.
import React from 'react';

export default function DeprecatedFirebaseUI() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl bg-white rounded-lg shadow p-6 text-gray-700">
        <h2 className="text-xl font-semibold mb-2">Componente Firebase (obsoleto)</h2>
        <p className="mb-2">Esta versión del cliente que usaba Firebase/Firestore ha sido retirada.</p>
        <p className="mb-2">La aplicación ahora funciona en modo Supabase-only. Usa `pluxee-junaeb-guide.tsx` y los scripts en `scripts/` para gestionar datos en el servidor.</p>
        <p className="text-sm text-gray-500">Si necesitas restaurar funcionalidades de edición o carga desde el cliente, házmelo saber y lo evaluamos cuidadosamente.</p>
      </div>
    </div>
  );
}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map(store => (
            <div
              key={store.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden"
              onClick={() => setSelectedStore(store)}
            >
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{store.name}</h3>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full inline-block mt-1">
                      {store.category}
                    </span>
                  </div>
                  <Store size={24} />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2 text-gray-600 mb-2">
                  <MapPin size={16} className="mt-1 flex-shrink-0" />
                  <span className="text-sm">{store.address}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign size={16} />
                  <span className="text-sm">{store.menuItems?.length || 0} productos</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStores.length === 0 && (
          <div className="text-center py-12">
            <Store size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">
              No se encontraron {activeTab === 'restaurants' ? 'restaurantes' : 'supermercados'}
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={loadInitialData}
                className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2"
              >
                <Store size={20} />
                Cargar locales base
              </button>
              <button
                onClick={() => setShowAISearch(true)}
                className="text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-2"
              >
                <Sparkles size={20} />
                Buscar con IA
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
          onEdit={(store) => {
            setEditingStore(store);
            setSelectedStore(null);
          }}
          onDelete={deleteStore}
        />
      )}

      {showAddForm && (
        <StoreFormModal
          store={null}
          onClose={() => setShowAddForm(false)}
          onSave={addStore}
        />
      )}

      {editingStore && (
        <StoreFormModal
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSave={updateStore}
        />
      )}

      {showAISearch && (
        <AISearchModal
          onClose={() => setShowAISearch(false)}
          onSave={addMultipleStores}
        />
      )}
    </div>
  );
};

// Los componentes AISearchModal, StoreDetailModal y StoreFormModal van aquí igual que antes...
// (Son muy largos, los incluiré en archivos separados)

// initialStores removed — client-side initial seed disabled.

export default PluxeeGuide;