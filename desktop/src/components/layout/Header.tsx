import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBar } from '../../context/BarContext';
import { Button } from '../ui/Button';
import { LogOut } from 'lucide-react';
import './Header.css';

export function Header() {
	const { user, logout, isAuthenticated } = useAuth();
	const { selectedBar } = useBar();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate('/auth/login');
	};

	return (
		<header className="header">
			<div className="header-content">
				<div className="header-left">
					{selectedBar && (
						<div className="header-bar-badge">
							<span className="header-bar-name">{selectedBar.name}</span>
						</div>
					)}
				</div>
				{isAuthenticated && (
					<nav className="header-nav">
						{user && (
							<div className="header-user">
								<span className="header-user-name">{user.name}</span>
								<span className="header-user-role">{user.role}</span>
							</div>
						)}
						<Button variant="ghost" size="sm" onClick={handleLogout}>
							<LogOut size={16} />
							Выйти
						</Button>
					</nav>
				)}
			</div>
		</header>
	);
}
