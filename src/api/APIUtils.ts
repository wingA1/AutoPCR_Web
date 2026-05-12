import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { Route as LoginRoute } from "@routes/daily/login";
import { toaster } from '@components/ui/toaster';

// 扩展 AxiosRequestConfig 类型以支持自定义配置
declare module 'axios' {
    export interface AxiosRequestConfig {
        /** 是否跳过全局错误提示 */
        skipErrorHandler?: boolean;
        /** 是否跳过 401 自动跳转 */
        skipAuthRedirect?: boolean;
        _retryCount?: number;
    }
}

axios.defaults.withCredentials = true;

const BASE_CONFIG: AxiosRequestConfig = {
    timeout: 30000, 
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'X-APP-Version': APP_VERSION,
    },
};

export const API = axios.create({
    ...BASE_CONFIG,
    baseURL: "/daily/api/",
});

export const Fetch = axios.create({
    ...BASE_CONFIG,
});

/**
 * 解析错误信息
 */
const getErrorMessage = (error: AxiosError): string => {
    if (error.response) {
        const data = error.response.data as any;
        // 如果后端返回的是字符串，直接使用；如果是对象，尝试获取 message 或 error 字段
        if (typeof data === 'string') return data;
        return data?.message || data?.error || `请求失败 (${error.response.status})`;
    } else if (error.request) {
        return '服务器无响应，请检查网络连接';
    } else {
        return error.message || '未知错误';
    }
};

/**
 * 全局响应拦截器
 */
const MAX_429_RETRY = 2;
const RETRY_DELAY_MS = 1500;

const getRetryAfter = (error: AxiosError): number => {
    const retryAfter = error.response?.headers?.["retry-after"];
    if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
    }
    return RETRY_DELAY_MS;
};

function createErrorHandler(instance: typeof API) {
return (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 429) {
        const retryCount = error.config?._retryCount ?? 0;
        const delay = getRetryAfter(error);
        if (retryCount < MAX_429_RETRY) {
            error.config!._retryCount = retryCount + 1;
            toaster.create({
                title: "操作过于频繁",
                description: "系统繁忙" + Math.ceil(delay / 1000) + "秒后自动重试 (" + (retryCount + 1) + "/" + MAX_429_RETRY + ")",
                type: "warning",
                duration: 2000,
            });
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(instance.request(error.config!));
                }, delay * (retryCount + 1));
            });
        }
        toaster.create({
            title: "操作过于频繁",
            description: "请求过于频繁，请稍后再试",
            type: "error",
            duration: 4000,
        });
        return Promise.reject(error);
    }

    if (!error.config?.skipErrorHandler) {
        const message = getErrorMessage(error);
        toaster.create({
            title: "操作失败",
            description: message,
            type: "error",
            duration: 4000,
        });
    }

    if (status === 401 && !error.config?.skipAuthRedirect) {
        if (window.location.pathname !== LoginRoute.to) {
             window.location.href = LoginRoute.to;
        }
    }

    return Promise.reject(error);
};
}

API.interceptors.response.use((response) => response, createErrorHandler(API));
Fetch.interceptors.response.use((response) => response, createErrorHandler(Fetch));


