import { PartnerLayout, PartnerCard } from "@/components/partner/PartnerLayout";
import { partnerApi } from "@/lib/partnerApi";
import {
  YoactivMembersBrowser,
  type YoactivMembersApi,
} from "@/components/YoactivMembersBrowser";

const api: YoactivMembersApi = {
  branches: partnerApi.yoactiv.branches,
  members: partnerApi.yoactiv.members,
  memberDetail: partnerApi.yoactiv.memberDetail,
  trainers: partnerApi.yoactiv.trainers,
  setTrainerPhoto: partnerApi.yoactiv.setTrainerPhoto,
  removeTrainerPhoto: partnerApi.yoactiv.removeTrainerPhoto,
  setMemberPhoto: partnerApi.yoactiv.setMemberPhoto,
  removeMemberPhoto: partnerApi.yoactiv.removeMemberPhoto,
};

export default function PartnerMembers() {
  return (
    <PartnerLayout title="Gym Members">
      <PartnerCard>
        <YoactivMembersBrowser
          api={api}
          emptyBranchesMessage="None of your gyms are connected to YoActiv yet. Ask the admin team to map your gyms to their YoActiv branch, and your member list will appear here."
        />
      </PartnerCard>
    </PartnerLayout>
  );
}
