import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Users, Shield, User, Save, X, AlertTriangle } from 'lucide-react';
import { authService, storesService } from '../../services/api';
import { normalizeApiResponse } from '../../config/api';
import { User as UserType, Magasin } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { ImageUpload } from '../ImageUpload';
import toast from 'react-hot-toast';

export const UtilisateursPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    role: 'employe' as 'admin' | 'manager' | 'employe',
    magasin: '',
    image: null as File | null
  });

  useEffect(() => {
    fetchUsers();
    fetchMagasins();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await authService.getUsers();
      const normalizedData = normalizeApiResponse(data);
      setUsers(normalizedData.map((item: any) => ({
        ...item,
        createdAt: new Date(item.date_joined || item.created_at)
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchMagasins = async () => {
    try {
      const data = await storesService.getStores();
      const normalizedData = normalizeApiResponse(data);
      setMagasins(normalizedData.map((item: any) => ({
        ...item,
        createdAt: new Date(item.created_at)
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des magasins:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        // Modification d'un utilisateur existant
        const updateData: any = {
          nom: formData.nom,
          prenom: formData.prenom,
          role: formData.role,
        };
        
        if (formData.magasin) {
          updateData.magasin = formData.magasin;
        }
        
        if (formData.image) {
          updateData.image = formData.image;
        }

        await authService.updateUser(editingUser.id, updateData);
        toast.success('Utilisateur modifié avec succès');
      } else {
        // Création d'un nouvel utilisateur
        const requiredFields = ['email', 'nom', 'prenom', 'password', 'role'];
        const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
        
        if (missingFields.length > 0) {
          const errorMsg = `Champs manquants: ${missingFields.join(', ')}`;
          toast.error(errorMsg);
          return;
        }
        
        // Validation du format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          toast.error('Format d\'email invalide');
          return;
        }
        
        // Validation du mot de passe
        if (formData.password.length < 6) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères');
          return;
        }
        
        // Préparer les données pour l'envoi
        const userData = {
          email: formData.email.trim(),
          nom: formData.nom.trim(),
          prenom: formData.prenom.trim(),
          password: formData.password,
          role: formData.role,
          magasin: formData.magasin || null,
          image: formData.image,
        };
        
        await authService.createUser(userData);
        toast.success('Utilisateur créé avec succès');
      }

      resetForm();
      await fetchUsers();
      
    } catch (error: any) {
      console.error('Erreur dans handleSubmit:', error);
      
      let errorMessage = 'Erreur lors de la sauvegarde';
      
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          
          if (errorData.error) {
            if (errorData.error.includes('missing') && errorData.error.includes('username')) {
              errorMessage = 'Erreur technique: nom d\'utilisateur manquant. Veuillez réessayer.';
            } else {
              errorMessage = errorData.error;
            }
          } else if (errorData.email) {
            errorMessage = Array.isArray(errorData.email) ? errorData.email[0] : 'Cette adresse email est déjà utilisée';
          } else if (errorData.username) {
            errorMessage = Array.isArray(errorData.username) ? errorData.username[0] : 'Ce nom d\'utilisateur est déjà utilisé';
          } else if (errorData.password) {
            errorMessage = Array.isArray(errorData.password) ? errorData.password[0] : 'Le mot de passe ne respecte pas les critères';
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.non_field_errors) {
            errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
          }
        } catch (parseError) {
          errorMessage = error.message || 'Erreur technique inconnue';
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      nom: user.nom || '',
      prenom: user.prenom || '',
      password: '',
      role: user.role,
      magasin: user.magasin_id || '',
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = async (user: UserType) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      await authService.deleteUser(user.id);
      toast.success('Utilisateur supprimé avec succès');
      await fetchUsers();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      password: '',
      role: 'employe',
      magasin: '',
      image: null
    });
    setEditingUser(null);
    setShowModal(false);
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.nom && user.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.prenom && user.prenom.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-1">Gérez les accès et permissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher par email, nom ou prénom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Magasin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                // Correction: Rechercher le magasin par ID numérique
                const magasin = magasins.find(m => m.id.toString() === user.magasin_id?.toString());
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.image_url ? (
                            <img
                              src={`http://localhost:8000${user.image_url}`}
                              alt={`${user.prenom} ${user.nom}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.prenom} {user.nom}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="h-3 w-3 mr-1" />
                            Administrateur
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3 mr-1" />
                            Employé
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {magasin ? magasin.nom : (
                        <span className="text-gray-400 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Non assigné
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Aucun utilisateur ne correspond à votre recherche.' : 'Commencez par ajouter votre premier utilisateur.'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingUser ? 'Modifier l\'Utilisateur' : 'Nouvel Utilisateur'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <ImageUpload
                  currentImage={editingUser?.image_url ? `http://localhost:8000${editingUser.image_url}` : undefined}
                  onImageChange={(file) => setFormData({ ...formData, image: file })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Prénom"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nom de famille"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="utilisateur@exemple.com"
                  />
                  {editingUser && (
                    <p className="text-sm text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                  )}
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Minimum 6 caractères"
                      minLength={6}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rôle *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'employe' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="employe">Employé</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.role === 'admin' 
                      ? 'Accès complet à toutes les fonctionnalités' 
                      : formData.role === 'manager'
                      ? 'Gestion complète de son magasin et de ses employés'
                      : 'Accès limité au pointage et gestion du stock de son magasin'
                    }
                  </p>
                </div>

                {(formData.role === 'employe' || formData.role === 'manager') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.role === 'manager' ? 'Magasin à gérer' : 'Magasin assigné'}
                    </label>
                    <select
                      required={formData.role === 'manager'}
                      value={formData.magasin}
                      onChange={(e) => setFormData({ ...formData, magasin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{formData.role === 'manager' ? 'Sélectionner un magasin' : 'Aucun magasin assigné'}</option>
                      {magasins.map((magasin) => (
                        <option key={magasin.id} value={magasin.id}>
                          {magasin.nom}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.role === 'manager' 
                        ? 'Le manager aura la gestion complète de ce magasin'
                        : 'L\'employé ne pourra pointer que dans ce magasin'}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingUser ? 'Modifier' : 'Créer'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};