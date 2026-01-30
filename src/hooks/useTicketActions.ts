import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketAPI, messageAPI } from '@/lib/api/endpoints'
import { toast } from '@/hooks/use-toast'

// Hook untuk update tiket
export const useUpdateTicket = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            ticketAPI.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] })
            toast({
                title: '✅ Berhasil',
                description: 'Tiket berhasil diperbarui',
            })
        },
        onError: (error: any) => {
            toast({
                title: '❌ Gagal',
                description: error.response?.data?.message || 'Gagal memperbarui tiket',
                variant: 'destructive',
            })
        },
    })
}

// Hook untuk delete tiket
export const useDeleteTicket = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => ticketAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            toast({
                title: '✅ Berhasil',
                description: 'Tiket berhasil dihapus',
            })
        },
        onError: (error: any) => {
            toast({
                title: '❌ Gagal',
                description: error.response?.data?.message || 'Gagal menghapus tiket',
                variant: 'destructive',
            })
        },
    })
}

// Hook untuk assign user ke tiket
export const useAssignUser = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ ticketId, userId }: { ticketId: number; userId: number }) =>
            ticketAPI.assignUser(ticketId, userId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
            toast({
                title: '✅ Berhasil',
                description: 'User berhasil di-assign ke tiket',
            })
        },
        onError: (error: any) => {
            toast({
                title: '❌ Gagal',
                description: error.response?.data?.message || 'Gagal assign user',
                variant: 'destructive',
            })
        },
    })
}

// Hook untuk update stage tiket
export const useUpdateStage = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ ticketId, stageId }: { ticketId: number; stageId: number }) =>
            ticketAPI.updateStage(ticketId, stageId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            toast({
                title: '✅ Berhasil',
                description: 'Status tiket berhasil diperbarui',
            })
        },
        onError: (error: any) => {
            toast({
                title: '❌ Gagal',
                description: error.response?.data?.message || 'Gagal memperbarui status',
                variant: 'destructive',
            })
        },
    })
}

// Hook untuk update priority tiket
export const useUpdatePriority = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ ticketId, priority }: { ticketId: number; priority: string }) =>
            ticketAPI.updatePriority(ticketId, priority),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
            toast({
                title: '✅ Berhasil',
                description: 'Prioritas tiket berhasil diperbarui',
            })
        },
        onError: (error: any) => {
            toast({
                title: '❌ Gagal',
                description: error.response?.data?.message || 'Gagal memperbarui prioritas',
                variant: 'destructive',
            })
        },
    })
}

// Hook untuk post reply/message
export const usePostMessage = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            ticketId,
            data,
        }: {
            ticketId: number
            data: {
                body: string
                internal?: boolean
                attachments?: Array<{ filename: string; file_data: string }>
            }
        }) => messageAPI.postMessage(ticketId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['messages', variables.ticketId],
            })
            queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] })
            toast({
                title: '✅ Berhasil',
                description: 'Balasan berhasil dikirim',
            })
        },
        onError: (error: any) => {
            toast({
                title: '❌ Gagal',
                description: error.response?.data?.message || 'Gagal mengirim balasan',
                variant: 'destructive',
            })
        },
    })
}
