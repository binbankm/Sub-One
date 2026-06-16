import { ref, watch } from 'vue';

import type { Node } from '@/common/types/index';
import { parseImportText } from '@/common/utils/importer';

import { useToastStore } from '@/stores/useNotificationStore';
import i18n from '@/i18n';

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
            errorMessage.value = i18n.global.t('entities.node.import.fileTooLarge');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                textContent.value = result;
                errorMessage.value = '';
                toastStore.showToast(i18n.global.t('entities.node.import.fileRead').replace('{name}', file.name), 'success');
            }
        };
        reader.onerror = () => {
            errorMessage.value = i18n.global.t('entities.node.import.fileReadError');
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
                i18n.global.t('entities.node.import.importSuccessMethod').replace('{method}', methodMsg).replace('{count}', String(newNodes.length)),
                'success'
            );
            emit('update:show', false);
        } else {
            errorMessage.value = i18n.global.t('entities.node.import.parseFailed');
        }
    };

    const importSubscription = async () => {
        errorMessage.value = '';

        if (mode.value === 'url') {
            if (!subscriptionUrl.value.trim()) {
                errorMessage.value = i18n.global.t('entities.node.import.emptyUrl');
                return;
            }
            try {
                new URL(subscriptionUrl.value);
            } catch {
                errorMessage.value = i18n.global.t('entities.node.import.invalidUrl');
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

                await _processParseResponse(await response.json(), i18n.global.t('entities.subscription.actions.import'));
            } catch (error: unknown) {
                console.error('Import failed:', error);
                const msg = error instanceof Error ? error.message : String(error);
                errorMessage.value = i18n.global.t('entities.node.import.importFailedMsg').replace('{msg}', msg);
            } finally {
                isLoading.value = false;
            }
        } else {
            if (!textContent.value.trim()) {
                errorMessage.value = i18n.global.t('entities.node.import.emptyContent');
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
                    toastStore.showToast(i18n.global.t('entities.node.import.importSuccess').replace('{count}', String(nodes.length)), 'success');
                    emit('update:show', false);
                } else if (subs.length > 0) {
                    errorMessage.value = i18n.global.t('entities.node.import.subsDetected').replace('{count}', String(subs.length));
                } else {
                    const response = await fetch('/api/node_count', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: textContent.value,
                            returnNodes: true
                        })
                    });

                    if (!response.ok) throw new Error(i18n.global.t('entities.node.import.backendParseFailed'));
                    await _processParseResponse(await response.json(), i18n.global.t('entities.subscription.actions.import'));
                }
            } catch (error: unknown) {
                console.error('Import failed:', error);
                const msg = error instanceof Error ? error.message : String(error);
                errorMessage.value = i18n.global.t('entities.node.import.importFailedMsgExt').replace('{msg}', msg);
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
