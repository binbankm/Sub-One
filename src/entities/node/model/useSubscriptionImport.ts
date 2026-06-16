import { ref, watch } from 'vue';

import type { Node } from '@/common/types/index';
import { parseImportText } from '@/common/utils/importer';

import { useToastStore } from '@/stores/useNotificationStore';

export function useSubscriptionImport(
    props: {
        show: boolean;
        addNodesFromBulk: (nodes: Node[]) => void;
        onImportSuccess?: () => Promise<void>;
    },
    emit: any
) {
    const toastStore = useToastStore();

    const mode = ref<'url' | 'text'>('url');
    const subscriptionUrl = ref('');
    const textContent = ref('');
    const isLoading = ref(false);
    const errorMessage = ref('');
    const isDragging = ref(false);

    watch(
        () => props.show,
        (newVal) => {
            if (!newVal) {
                subscriptionUrl.value = '';
                textContent.value = '';
                errorMessage.value = '';
                isLoading.value = false;
                mode.value = 'url';
                isDragging.value = false;
            }
        }
    );

    const readFileContent = (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            errorMessage.value = '文件过大，请上传小于 5MB 的文件';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                textContent.value = result;
                errorMessage.value = '';
                toastStore.showToast(`已读取文件: ${file.name}`, 'success');
            }
        };
        reader.onerror = () => {
            errorMessage.value = '文件读取失败';
        };
        reader.readAsText(file);
    };

    const handleFileSelect = (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            readFileContent(input.files[0]);
            input.value = '';
        }
    };

    const handleFileDrop = (event: DragEvent) => {
        isDragging.value = false;
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            readFileContent(event.dataTransfer.files[0]);
        }
    };

    const handleNodeMapping = (nodes: any[]): Node[] => {
        return nodes.map((n: Node) => ({
            ...n,
            id: n.id || crypto.randomUUID(),
            enabled: true
        })) as unknown as Node[];
    };

    const _processParseResponse = async (data: any, methodMsg: string) => {
        const newNodes = handleNodeMapping(data.nodes || []);
        if (newNodes.length > 0) {
            props.addNodesFromBulk(newNodes);
            if (props.onImportSuccess) {
                await props.onImportSuccess();
            }
            toastStore.showToast(
                `🚀 ${methodMsg}成功！共添加 ${newNodes.length} 个节点`,
                'success'
            );
            emit('update:show', false);
        } else {
            errorMessage.value = '未能解析出任何节点，请检查内容或链接是否正确。';
        }
    };

    const importSubscription = async () => {
        errorMessage.value = '';

        if (mode.value === 'url') {
            if (!subscriptionUrl.value.trim()) {
                errorMessage.value = '请输入订阅链接';
                return;
            }
            try {
                new URL(subscriptionUrl.value);
            } catch {
                errorMessage.value = '请输入有效的 URL (例如 https://example.com/...)';
                return;
            }

            isLoading.value = true;
            try {
                const response = await fetch('/api/node_count', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: subscriptionUrl.value.trim(),
                        returnNodes: true
                    })
                });

                if (!response.ok) {
                    const errorData = (await response.json()) as any;
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                await _processParseResponse(await response.json(), '导入');
            } catch (error: unknown) {
                console.error('导入失败:', error);
                const msg = error instanceof Error ? error.message : String(error);
                errorMessage.value = `导入失败: ${msg}`;
            } finally {
                isLoading.value = false;
            }
        } else {
            if (!textContent.value.trim()) {
                errorMessage.value = '请粘贴订阅内容或上传文件';
                return;
            }

            isLoading.value = true;
            try {
                const { subs, nodes } = parseImportText(textContent.value);

                if (nodes.length > 0) {
                    props.addNodesFromBulk(nodes);
                    if (props.onImportSuccess) {
                        await props.onImportSuccess();
                    }
                    toastStore.showToast(`导入成功！共添加 ${nodes.length} 个节点`, 'success');
                    emit('update:show', false);
                } else if (subs.length > 0) {
                    errorMessage.value = `检测到 ${subs.length} 个订阅链接，请使用 URL 导入模式或在订阅管理中添加。`;
                } else {
                    const response = await fetch('/api/node_count', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: textContent.value,
                            returnNodes: true
                        })
                    });

                    if (!response.ok) throw new Error('后端解析也失败了');
                    await _processParseResponse(await response.json(), '导入');
                }
            } catch (error: unknown) {
                console.error('导入失败:', error);
                const msg = error instanceof Error ? error.message : String(error);
                errorMessage.value = `导入失败: ${msg}。支持节点链接、Clash(YAML)、Base64 等格式。`;
            } finally {
                isLoading.value = false;
            }
        }
    };

    return {
        mode,
        subscriptionUrl,
        textContent,
        isLoading,
        errorMessage,
        isDragging,
        handleFileSelect,
        handleFileDrop,
        importSubscription
    };
}
