import {
    Modal,
    ModalBody,
    ModalContent,
    ModalHeader,
    ModalOverlay,
} from '../../components/ui/modal'
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { Button, Flex } from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';

import { ResultInfo } from "./ResultInfo"
import { ResultInfo as ResultInfoInterface } from '@interfaces/UserInfo';

interface ModalProps {
    alias: string
    title: string
    resultInfo: ResultInfoInterface[]
}

const resultModal = NiceModal.create(({ alias, title, resultInfo }: ModalProps) => {
    const modal = useModal();
    return (
        <Modal blockScrollOnMount={false} size="full" closeOnOverlayClick={false} isOpen={modal.visible} onClose={modal.hide}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    <Flex align="center" gap={3}>
                        <Button size="sm" variant="ghost" onClick={modal.hide}>
                            <FiArrowLeft /> {'\u8fd4\u56de\u7ed3\u679c\u5217\u8868'}
                        </Button>
                        <span>{`${alias} ${title} \u7ed3\u679c`}</span>
                    </Flex>
                </ModalHeader>
                <ModalBody>
                    <ResultInfo resultInfo={resultInfo} />
                </ModalBody>

            </ModalContent>
        </Modal>
    )
})

export default resultModal;
