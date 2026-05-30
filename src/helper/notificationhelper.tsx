import { notifications } from '@mantine/notifications';
import { LuCircleCheck, LuCircleX } from 'react-icons/lu';
import { MdOutlineCheck } from "react-icons/md";

interface NotifyOptions {
  title?: string;
  message: string;
}

export function showsucessnotification({ title = 'Success', message }: NotifyOptions) {
  notifications.show({
    title,
    message,
    color: 'green',
    icon: <MdOutlineCheck size={18} />,
    autoClose: 4000,
    withBorder: true,
  });
}

export function showerrornotification({ title = 'Error', message }: NotifyOptions) {
  notifications.show({
    title,
    message,
    color: 'red',
    icon: <LuCircleX size={18} />,
    autoClose: 5000,
    withBorder: true,
  });
}
