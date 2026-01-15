import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		let status = HttpStatus.INTERNAL_SERVER_ERROR;
		let message: string | string[] = 'Internal server error';
		let error = 'Internal Server Error';

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const exceptionResponse = exception.getResponse();

			if (typeof exceptionResponse === 'string') {
				message = exceptionResponse;
			} else if (typeof exceptionResponse === 'object') {
				message =
					(exceptionResponse as any).message ||
					exception.message ||
					'An error occurred';
				error = (exceptionResponse as any).error || error;
			}
		} else if (exception instanceof Error) {
			message = exception.message;
		}

		const errorResponse = {
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			method: request.method,
			message: Array.isArray(message) ? message : [message],
			error,
		};

		// Логируем ошибки
		const isProduction = process.env.NODE_ENV === 'production';
		
		if (status >= 500) {
			console.error('Server Error:', {
				status,
				path: request.url,
				method: request.method,
				error: exception instanceof Error ? exception.message : 'Unknown error',
				stack: isProduction ? undefined : (exception instanceof Error ? exception.stack : undefined),
			});
		}

		// В продакшене скрываем детали ошибок
		if (isProduction && status >= 500) {
			errorResponse.message = ['Internal server error'];
			errorResponse.error = 'Internal Server Error';
		}

		response.status(status).json(errorResponse);
	}
}
