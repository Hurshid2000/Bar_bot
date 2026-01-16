import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import './Header.css';

export function Header() {
	const { user, logout, isAuthenticated } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate('/auth/login');
	};

	return (
		<header className="header">
			<div className="header-content">
				<Link to="/" className="header-logo">
					<h1>Bar CRM</h1>
				</Link>
				{isAuthenticated && (
					<nav className="header-nav">
						{user && (
							<div className="header-user">
								<span className="header-user-name">{user.name}</span>
								<span className="header-user-role">{user.role}</span>
							</div>
						)}
						<Button variant="ghost" size="sm" onClick={handleLogout}>
							Выйти
						</Button>
					</nav>
				)}
			</div>
		</header>
	);
}
