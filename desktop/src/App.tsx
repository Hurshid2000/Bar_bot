import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { BarProvider } from './context/BarContext';
import { router } from './router';
import './App.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<BarProvider>
					<RouterProvider router={router} />
				</BarProvider>
			</AuthProvider>
		</QueryClientProvider>
	);
}

export default App;
