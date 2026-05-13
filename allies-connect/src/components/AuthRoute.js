import { Navigate } from "react-router-dom";

function AuthRoute({ user, role, requiredRole, children }) {
    if (!user) {
        return <Navigate to="/login" replace/>;
    }

    if (requiredRole && role !== requiredRole) {
        return <Navigate to="/" replace/>;
    }

    return children;
}

export default AuthRoute;