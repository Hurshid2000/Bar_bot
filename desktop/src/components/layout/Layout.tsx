import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import './Layout.css';

export function Layout() {
	return (
		<div className="layout">
			<Sidebar />
			<div className="layout-content">
				<Header />
				<main className="layout-main">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
