import React, { createContext, useContext } from "react";

const AuthContext = createContext();

const publicUser = {
  id: "public-link-user",
  email: "public@local",
  role: "public",
};

export const AuthProvider = ({ children }) => {
  const noop = async () => publicUser;

  return (
    <AuthContext.Provider
      value={{
        user: publicUser,
        isAuthenticated: true,
        isLoadingAuth: false,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        authChecked: true,
        logout: () => {},
        navigateToLogin: () => {},
        checkUserAuth: noop,
        checkAppState: noop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
