import { computed, ref, watch } from 'vue';
import type { Node, Profile, Subscription } from '../../../types/index';
import { filterNodes } from '../../../utils/search';
import { generateShortId } from '../../../utils/helpers';

export interface UseProfileFormProps {
    profile?: Profile | null;
    isNew?: boolean;
    allSubscriptions?: Subscription[];
    allManualNodes?: Node[];
}

export function useProfileForm(
    props: UseProfileFormProps,
    onSave: (profile: Profile) => void
) {
    const localProfile = ref<Profile>({
        id: '',
        name: '',
        enabled: true,
        subscriptions: [],
        manualNodes: [],
        customId: '',
        expiresAt: '',
        type: 'base64'
    });

    const subscriptionSearchTerm = ref('');
    const nodeSearchTerm = ref('');

    const handleGenerateShortId = () => {
        localProfile.value.customId = generateShortId(8);
    };

    const filteredSubscriptions = computed(() => {
        const subs = props.allSubscriptions || [];
        const candidates = subs.filter((sub) => {
            const isEnabled = sub.enabled;
            const isSelected =
                localProfile.value.subscriptions &&
                localProfile.value.subscriptions.includes(sub.id);
            return isEnabled || isSelected;
        });

        return filterNodes(candidates, subscriptionSearchTerm.value);
    });

    const filteredManualNodes = computed(() => {
        const nodes = props.allManualNodes || [];
        return filterNodes(nodes, nodeSearchTerm.value);
    });

    watch(
        () => props.profile,
        (newProfile) => {
            if (newProfile) {
                const profileCopy = JSON.parse(JSON.stringify(newProfile));
                if (profileCopy.expiresAt) {
                    try {
                        profileCopy.expiresAt = new Date(profileCopy.expiresAt)
                            .toISOString()
                            .split('T')[0];
                    } catch (e) {
                        console.error('Error parsing expiresAt date:', e);
                        profileCopy.expiresAt = '';
                    }
                }
                localProfile.value = profileCopy;
            } else {
                localProfile.value = {
                    id: '',
                    name: '',
                    enabled: true,
                    subscriptions: [],
                    manualNodes: [],
                    customId: '',
                    expiresAt: '',
                    type: 'base64'
                };
            }
        },
        { deep: true, immediate: true }
    );

    const handleConfirm = () => {
        const profileToSave = JSON.parse(JSON.stringify(localProfile.value));
        if (profileToSave.expiresAt) {
            try {
                const date = new Date(profileToSave.expiresAt);
                date.setHours(23, 59, 59, 999);
                profileToSave.expiresAt = date.toISOString();
            } catch (e) {
                console.error('Error processing expiresAt date:', e);
                profileToSave.expiresAt = '';
            }
        }
        onSave(profileToSave);
    };

    const toggleSelection = (listName: 'subscriptions' | 'manualNodes', id: string) => {
        if (!localProfile.value[listName]) {
            localProfile.value[listName] = [];
        }
        const list = localProfile.value[listName];
        const index = list.indexOf(id);
        if (index > -1) {
            list.splice(index, 1);
        } else {
            list.push(id);
        }
    };

    const handleSelectAll = (
        listName: 'subscriptions' | 'manualNodes',
        sourceArray: { id: string }[]
    ) => {
        const currentSelection = new Set(localProfile.value[listName]);
        sourceArray.forEach((item) => currentSelection.add(item.id));
        localProfile.value[listName] = Array.from(currentSelection);
    };

    const handleDeselectAll = (
        listName: 'subscriptions' | 'manualNodes',
        sourceArray: { id: string }[]
    ) => {
        const sourceIds = sourceArray.map((item) => item.id);
        if (!localProfile.value[listName]) {
            localProfile.value[listName] = [];
        }
        localProfile.value[listName] = (localProfile.value[listName] as string[]).filter(
            (id) => !sourceIds.includes(id)
        );
    };

    return {
        localProfile,
        subscriptionSearchTerm,
        nodeSearchTerm,
        handleGenerateShortId,
        filteredSubscriptions,
        filteredManualNodes,
        handleConfirm,
        toggleSelection,
        handleSelectAll,
        handleDeselectAll
    };
}
